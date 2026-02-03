/**
 * Carrier Manual Bulk Seeding Script
 * 
 * This script will:
 * 1. Back up existing data
 * 2. Clean the database (remove old manuals, sections, models)
 * 3. Process all Carrier PDFs from /Users/brentpurks/Desktop/OEMTT/CARRIER/
 * 4. Upload to Supabase storage
 * 5. Extract text and tables from PDFs
 * 6. Chunk content intelligently
 * 7. Generate embeddings
 * 8. Create database records
 * 
 * Usage: tsx scripts/seed-carrier-manuals.ts
 */

import { prisma } from '../src/config/database';
import { supabase } from '../src/config/supabase';
import { generateEmbedding } from '../src/services/ingestion/embeddings';
import { processPDFManual } from '../src/services/ingestion/pdfProcessor';
import { chunkPDFPages } from '../src/services/ingestion/chunker';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Configuration
const CARRIER_FOLDER = '/Users/brentpurks/Desktop/OEMTT/CARRIER';
const BACKUP_FOLDER = path.join(__dirname, '../backups');
const SUPABASE_BUCKET = 'manuals';
const BATCH_SIZE = 5; // Process 5 PDFs concurrently
const MAX_RETRIES = 3;

interface ProcessingStats {
    totalPDFs: number;
    processed: number;
    failed: number;
    totalChunks: number;
    totalSize: number;
    startTime: Date;
    errors: Array<{ file: string; error: string }>;
}

const stats: ProcessingStats = {
    totalPDFs: 0,
    processed: 0,
    failed: 0,
    totalChunks: 0,
    totalSize: 0,
    startTime: new Date(),
    errors: [],
};

/**
 * Step 1: Back up existing data
 */
async function backupExistingData() {
    console.log('\n📦 Step 1: Backing up existing data...');

    if (!fs.existsSync(BACKUP_FOLDER)) {
        fs.mkdirSync(BACKUP_FOLDER, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_FOLDER, `backup-${timestamp}.json`);

    try {
        const [manuals, models, productLines, sections] = await Promise.all([
            prisma.manual.findMany({ include: { model: { include: { productLine: { include: { oem: true } } } } } }),
            prisma.model.findMany({ include: { productLine: { include: { oem: true } } } }),
            prisma.productLine.findMany({ include: { oem: true } }),
            prisma.manualSection.findMany({ select: { id: true, manualId: true, sectionTitle: true, sectionType: true, pageReference: true } }),
        ]);

        const backup = {
            timestamp: new Date().toISOString(),
            counts: {
                manuals: manuals.length,
                models: models.length,
                productLines: productLines.length,
                sections: sections.length,
            },
            data: {
                manuals,
                models,
                productLines,
                sections,
            },
        };

        fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
        console.log(`✅ Backup saved to: ${backupFile}`);
        console.log(`   - Manuals: ${backup.counts.manuals}`);
        console.log(`   - Models: ${backup.counts.models}`);
        console.log(`   - Sections: ${backup.counts.sections}`);
    } catch (error) {
        console.error('❌ Backup failed:', error);
        throw error;
    }
}

/**
 * Step 2: Clean the database
 */
async function cleanDatabase() {
    console.log('\n🧹 Step 2: Cleaning database...');

    try {
        // Delete in correct order (respecting foreign keys)
        const deletedSections = await prisma.manualSection.deleteMany({});
        console.log(`   - Deleted ${deletedSections.count} manual sections`);

        const deletedManuals = await prisma.manual.deleteMany({});
        console.log(`   - Deleted ${deletedManuals.count} manuals`);

        const deletedModels = await prisma.model.deleteMany({});
        console.log(`   - Deleted ${deletedModels.count} models`);

        const deletedProductLines = await prisma.productLine.deleteMany({});
        console.log(`   - Deleted ${deletedProductLines.count} product lines`);

        // Note: We keep OEMs (Carrier should already exist)
        console.log('✅ Database cleaned successfully');
    } catch (error) {
        console.error('❌ Failed to clean database:', error);
        throw error;
    }
}

/**
 * Step 3: Ensure Carrier OEM and product line exist
 */
async function ensureCarrierSetup() {
    console.log('\n🏢 Step 3: Ensuring Carrier OEM setup...');

    let carrierOem = await prisma.oEM.findFirst({ where: { name: 'Carrier' } });

    if (!carrierOem) {
        carrierOem = await prisma.oEM.create({
            data: {
                id: 'carrier',
                name: 'Carrier',
                vertical: 'HVAC',
                status: 'active',
            },
        });
        console.log('   - Created Carrier OEM');
    } else {
        console.log('   - Carrier OEM exists');
    }

    // Create a generic "Chillers" product line for now
    const productLine = await prisma.productLine.create({
        data: {
            id: 'carrier-chillers',
            oemId: carrierOem.id,
            name: 'Chillers',
            category: 'commercial_hvac',
            description: 'Carrier commercial chillers and cooling systems',
        },
    });

    console.log('   - Created Chillers product line');

    return { oem: carrierOem, productLine };
}

/**
 * Step 4: Scan all PDFs in the CARRIER folder
 */
async function scanPDFs(): Promise<Array<{ modelFolder: string; pdfPath: string; pdfName: string; size: number }>> {
    console.log('\n🔍 Step 4: Scanning PDFs...');

    const pdfs: Array<{ modelFolder: string; pdfPath: string; pdfName: string; size: number }> = [];
    const modelFolders = await readdir(CARRIER_FOLDER);

    for (const modelFolder of modelFolders) {
        const modelPath = path.join(CARRIER_FOLDER, modelFolder);
        const folderStat = await stat(modelPath);

        if (!folderStat.isDirectory()) continue;

        const files = await readdir(modelPath);

        for (const file of files) {
            if (file.toLowerCase().endsWith('.pdf')) {
                const pdfPath = path.join(modelPath, file);
                const fileStat = await stat(pdfPath);

                pdfs.push({
                    modelFolder,
                    pdfPath,
                    pdfName: file,
                    size: fileStat.size,
                });

                stats.totalSize += fileStat.size;
            }
        }
    }

    stats.totalPDFs = pdfs.length;
    console.log(`✅ Found ${pdfs.length} PDFs across ${modelFolders.length} model folders`);
    console.log(`   - Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);

    return pdfs;
}

/**
 * Step 5: Process a single PDF
 */
async function processPDF(
    pdf: { modelFolder: string; pdfPath: string; pdfName: string; size: number },
    productLineId: string,
    retryCount = 0
): Promise<void> {
    const { modelFolder, pdfPath, pdfName } = pdf;

    try {
        console.log(`\n📄 Processing: ${modelFolder}/${pdfName}`);

        // Create or get model
        let model = await prisma.model.findFirst({
            where: {
                modelNumber: modelFolder,
                productLineId,
            },
        });

        if (!model) {
            model = await prisma.model.create({
                data: {
                    modelNumber: modelFolder,
                    productLineId,
                    discontinued: false,
                },
            });
            console.log(`   ✓ Created model: ${modelFolder}`);
        }

        // Upload PDF to Supabase
        console.log(`   - Uploading to Supabase...`);
        const fileBuffer = await readFile(pdfPath);
        const storagePath = `carrier/${modelFolder}/${pdfName}`;

        const { error: uploadError } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .upload(storagePath, fileBuffer, {
                contentType: 'application/pdf',
                upsert: true,
            });

        if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
        }

        console.log(`   ✓ Uploaded to storage`);

        // Determine manual type from filename
        const manualType = determineManualType(pdfName);

        // Create manual record
        const manual = await prisma.manual.create({
            data: {
                modelId: model.id,
                manualType,
                title: `${modelFolder} - ${pdfName.replace('.pdf', '')}`,
                sourceUrl: storagePath,
                sourceType: 'oem',
                storagePath,
                status: 'processing',
                language: 'en',
            },
        });

        console.log(`   ✓ Created manual record (${manualType})`);

        // Process PDF content (extract text from storage)
        console.log(`   - Processing PDF content...`);
        const pdfResult = await processPDFManual(storagePath);

        if (!pdfResult.pages || pdfResult.pages.length === 0) {
            throw new Error('No pages extracted from PDF');
        }

        const totalText = pdfResult.pages.reduce((sum, p) => sum + p.text.length, 0);
        console.log(`   ✓ Extracted ${pdfResult.pages.length} pages, ${totalText} characters`);

        // Chunk the content
        console.log(`   - Chunking content...`);
        const chunks = chunkPDFPages(pdfResult.pages, 750); // 750 tokens per chunk

        console.log(`   ✓ Created ${chunks.length} chunks`);
        stats.totalChunks += chunks.length;

        // Process chunks in batches
        const chunkBatchSize = 10;
        for (let i = 0; i < chunks.length; i += chunkBatchSize) {
            const batchChunks = chunks.slice(i, i + chunkBatchSize);

            await Promise.all(
                batchChunks.map(async (chunk, idx) => {
                    const globalIdx = i + idx;

                    // Generate embedding
                    const embeddingResult = await generateEmbedding(chunk.content);

                    // Prepare metadata
                    const metadata = JSON.stringify({
                        chunkIndex: globalIdx,
                        totalChunks: chunks.length,
                        keywords: chunk.metadata.keywords,
                        modelNumbers: chunk.metadata.modelNumbers,
                        partNumbers: chunk.metadata.partNumbers,
                        pageNumbers: chunk.pageNumbers,
                        tokenCount: chunk.tokenCount,
                    });

                    const sectionTitle = chunk.sectionTitle || `Section ${globalIdx + 1}`;

                    // Save to database using raw SQL (Prisma doesn't support vector types properly)
                    await prisma.$executeRaw`
            INSERT INTO manual_sections (
              id, manual_id, section_title, section_type, content, 
              page_reference, embedding, metadata, created_at
            ) VALUES (
              gen_random_uuid(),
              ${manual.id}::uuid,
              ${sectionTitle},
              ${chunk.sectionType},
              ${chunk.content},
              ${chunk.pageReference},
              ${embeddingResult.embedding}::vector,
              ${metadata}::jsonb,
              NOW()
            )
          `;
                })
            );

            console.log(`   - Processed chunks ${i + 1}-${Math.min(i + chunkBatchSize, chunks.length)}/${chunks.length}`);
        }

        // Update manual status
        await prisma.manual.update({
            where: { id: manual.id },
            data: {
                status: 'active',
                pageCount: pdfResult.metadata.totalPages || null,
            },
        });

        stats.processed++;
        console.log(`✅ Completed: ${modelFolder}/${pdfName}`);
        console.log(`   Progress: ${stats.processed}/${stats.totalPDFs} (${((stats.processed / stats.totalPDFs) * 100).toFixed(1)}%)`);

    } catch (error: any) {
        console.error(`❌ Failed: ${modelFolder}/${pdfName}`, error.message);

        stats.errors.push({
            file: `${modelFolder}/${pdfName}`,
            error: error.message,
        });

        if (retryCount < MAX_RETRIES) {
            console.log(`   ⚠️  Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Exponential backoff
            return processPDF(pdf, productLineId, retryCount + 1);
        } else {
            stats.failed++;
        }
    }
}

/**
 * Helper: Determine manual type from filename
 */
function determineManualType(filename: string): string {
    const lower = filename.toLowerCase();

    if (lower.includes('install')) return 'installation';
    if (lower.includes('service') || lower.includes('maintenance')) return 'service';
    if (lower.includes('operation') || lower.includes('operator')) return 'operation';
    if (lower.includes('troubleshoot')) return 'troubleshooting';
    if (lower.includes('control') || lower.includes('clt')) return 'controls';
    if (lower.includes('startup') || lower.includes('start-up')) return 'startup';
    if (lower.includes('part')) return 'parts';

    return 'other';
}

/**
 * Step 6: Process all PDFs in batches
 */
async function processAllPDFs(pdfs: Array<{ modelFolder: string; pdfPath: string; pdfName: string; size: number }>, productLineId: string) {
    console.log(`\n⚙️  Step 5: Processing ${pdfs.length} PDFs (batch size: ${BATCH_SIZE})...`);

    for (let i = 0; i < pdfs.length; i += BATCH_SIZE) {
        const batch = pdfs.slice(i, i + BATCH_SIZE);

        console.log(`\n🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(pdfs.length / BATCH_SIZE)}`);

        await Promise.all(
            batch.map(pdf => processPDF(pdf, productLineId))
        );
    }
}

/**
 * Step 7: Print final statistics
 */
function printStats() {
    const duration = (Date.now() - stats.startTime.getTime()) / 1000;
    const avgTimePerPDF = duration / stats.processed;

    console.log('\n\n=================================');
    console.log('📊 SEEDING COMPLETE');
    console.log('=================================');
    console.log(`Total PDFs: ${stats.totalPDFs}`);
    console.log(`Processed: ${stats.processed}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Total Chunks: ${stats.totalChunks}`);
    console.log(`Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Duration: ${(duration / 60).toFixed(1)} minutes`);
    console.log(`Avg Time/PDF: ${avgTimePerPDF.toFixed(1)}s`);

    if (stats.errors.length > 0) {
        console.log('\n❌ Errors:');
        stats.errors.forEach(err => {
            console.log(`   - ${err.file}: ${err.error}`);
        });
    }

    console.log('\n=================================\n');
}

/**
 * Main execution
 */
async function main() {
    console.log('╔════════════════════════════════════════╗');
    console.log('║  CARRIER MANUAL BULK SEEDING SCRIPT    ║');
    console.log('╚════════════════════════════════════════╝');

    try {
        // Step 1: Backup
        await backupExistingData();

        // Step 2: Clean
        await cleanDatabase();

        // Step 3: Setup Carrier
        const { productLine } = await ensureCarrierSetup();

        // Step 4: Scan PDFs
        const pdfs = await scanPDFs();

        if (pdfs.length === 0) {
            console.log('⚠️  No PDFs found. Exiting.');
            return;
        }

        // Step 5: Process all PDFs
        await processAllPDFs(pdfs, productLine.id);

        // Step 6: Print stats
        printStats();

        console.log('✅ Seeding completed successfully!');
    } catch (error) {
        console.error('\n❌ Seeding failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
main().catch(console.error);
