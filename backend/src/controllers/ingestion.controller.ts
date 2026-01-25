/**
 * Ingestion Controller
 * 
 * Handles manual processing: PDF extraction, chunking, and embedding generation.
 */

import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { processPDFManual } from '@/services/ingestion/pdfProcessor';
import { chunkPDFPages } from '@/services/ingestion/chunker';
import { embedTextChunks } from '@/services/ingestion/embeddings';
import { AppError } from '@/middleware/errorHandler';

/**
 * Process a manual: extract text, chunk, embed, and store
 * 
 * POST /api/ingestion/process/:manualId
 * 
 * This is an admin/dev endpoint for on-demand manual processing.
 */
export async function processManual(req: Request, res: Response) {
    const manualId = Array.isArray(req.params.manualId) ? req.params.manualId[0] : req.params.manualId;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📚 Processing Manual: ${manualId}`);
    console.log('='.repeat(60));

    const startTime = Date.now();

    try {
        // 1. Fetch manual from database
        const manual = await prisma.manual.findUnique({
            where: { id: manualId },
            include: {
                model: {
                    include: {
                        productLine: {
                            include: {
                                oem: true,
                            },
                        },
                    },
                },
            },
        });

        if (!manual) {
            throw new AppError(404, 'Manual not found');
        }

        if (!manual.storagePath) {
            throw new AppError(400, 'Manual does not have a storage path (PDF not uploaded)');
        }

        console.log(`\n📖 Manual Info:`);
        console.log(`   Title: ${manual.title}`);
        console.log(`   OEM: ${manual.model.productLine.oem.name}`);
        console.log(`   Model: ${manual.model.modelNumber}`);
        console.log(`   Type: ${manual.manualType}`);
        console.log(`   Storage: ${manual.storagePath}`);

        // 2. Check if already processed
        const existingSections = await prisma.manualSection.count({
            where: { manualId },
        });

        if (existingSections > 0) {
            console.log(`\n⚠️  Manual already has ${existingSections} sections`);
            console.log(`   Delete existing sections first or use force=true`);

            if (req.query.force !== 'true') {
                return res.json({
                    success: false,
                    message: `Manual already processed (${existingSections} sections). Use ?force=true to reprocess.`,
                    manualId,
                    existingSections,
                });
            }

            console.log(`\n🗑️  Deleting ${existingSections} existing sections...`);
            await prisma.manualSection.deleteMany({
                where: { manualId },
            });
        }

        // 3. Process PDF
        console.log(`\n⚙️  Step 1: Extracting text from PDF...`);
        const pdfResult = await processPDFManual(manual.storagePath);

        // 4. Chunk pages
        console.log(`\n⚙️  Step 2: Chunking text into sections...`);
        const chunks = chunkPDFPages(pdfResult.pages);

        console.log(`\n📊 Chunking Stats:`);
        console.log(`   Total chunks: ${chunks.length}`);
        console.log(`   Avg tokens/chunk: ${Math.round(chunks.reduce((sum, c) => sum + c.tokenCount, 0) / chunks.length)}`);
        console.log(`   Section types:`);

        const typeCounts = chunks.reduce((acc, c) => {
            acc[c.sectionType] = (acc[c.sectionType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        Object.entries(typeCounts)
            .sort((a, b) => b[1] - a[1])
            .forEach(([type, count]) => {
                console.log(`     - ${type}: ${count}`);
            });

        // 5. Generate embeddings
        console.log(`\n⚙️  Step 3: Generating embeddings...`);
        const chunksWithEmbeddings = await embedTextChunks(chunks);

        // 6. Store in database
        console.log(`\n⚙️  Step 4: Storing sections in database...`);

        // Use raw SQL because Prisma doesn't support vector types natively
        for (const chunk of chunksWithEmbeddings) {
            await prisma.$executeRaw`
        INSERT INTO manual_sections (
          id, manual_id, section_title, section_type, content, 
          page_reference, embedding, metadata, created_at
        ) VALUES (
          gen_random_uuid(),
          ${manualId}::uuid,
          ${chunk.sectionTitle},
          ${chunk.sectionType},
          ${chunk.content},
          ${chunk.pageReference},
          ${`[${chunk.embedding.join(',')}]`}::vector,
          ${JSON.stringify(chunk.metadata)}::jsonb,
          NOW()
        )
      `;
        }

        const sectionsCount = chunksWithEmbeddings.length;

        // 7. Update manual status
        await prisma.manual.update({
            where: { id: manualId },
            data: {
                status: 'active',
                pageCount: pdfResult.metadata.totalPages,
            },
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`\n✅ Manual processing complete!`);
        console.log(`   Duration: ${duration}s`);
        console.log(`   Sections created: ${sectionsCount}`);
        console.log('='.repeat(60) + '\n');

        res.json({
            success: true,
            manualId,
            manual: {
                title: manual.title,
                oem: manual.model.productLine.oem.name,
                model: manual.model.modelNumber,
            },
            stats: {
                totalPages: pdfResult.metadata.totalPages,
                sectionsCreated: sectionsCount,
                avgTokensPerSection: Math.round(chunks.reduce((sum, c) => sum + c.tokenCount, 0) / chunks.length),
                processingTimeSeconds: parseFloat(duration),
            },
            sectionTypes: typeCounts,
        });

    } catch (error) {
        console.error(`\n❌ Manual processing failed:`, error);
        console.log('='.repeat(60) + '\n');
        throw error;
    }
}

/**
 * Get processing status for a manual
 * 
 * GET /api/ingestion/status/:manualId
 */
export async function getProcessingStatus(req: Request, res: Response) {
    const manualId = Array.isArray(req.params.manualId) ? req.params.manualId[0] : req.params.manualId;

    const manual = await prisma.manual.findUnique({
        where: { id: manualId },
        include: {
            _count: {
                select: { sections: true },
            },
        },
    });

    if (!manual) {
        throw new AppError(404, 'Manual not found');
    }

    res.json({
        manualId,
        status: manual.status,
        pageCount: manual.pageCount,
        sectionsCount: manual._count.sections,
        hasStoragePath: !!manual.storagePath,
        isProcessed: manual._count.sections > 0,
    });
}

/**
 * List all manuals with processing status
 * 
 * GET /api/ingestion/manuals
 */
export async function listManuals(req: Request, res: Response) {
    const manuals = await prisma.manual.findMany({
        include: {
            model: {
                include: {
                    productLine: {
                        include: {
                            oem: true,
                        },
                    },
                },
            },
            _count: {
                select: { sections: true },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    const formatted = manuals.map(m => ({
        id: m.id,
        title: m.title,
        oem: m.model.productLine.oem.name,
        model: m.model.modelNumber,
        type: m.manualType,
        status: m.status,
        pageCount: m.pageCount,
        sectionsCount: m._count.sections,
        hasStoragePath: !!m.storagePath,
        isProcessed: m._count.sections > 0,
        canProcess: !!m.storagePath && m._count.sections === 0,
    }));

    res.json({
        total: formatted.length,
        processed: formatted.filter(m => m.isProcessed).length,
        pending: formatted.filter(m => m.canProcess).length,
        manuals: formatted,
    });
}
