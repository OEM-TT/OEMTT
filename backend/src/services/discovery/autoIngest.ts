/**
 * Auto-Ingestion Orchestrator
 * Discovers, downloads, and processes manuals on-demand
 */

import { findAllManuals, findManualPDF } from './perplexity';
import { prisma } from '@/config/database';
import { supabase } from '@/config/supabase';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

interface AutoIngestResult {
  success: boolean;
  manualIds?: string[];
  message: string;
  manuals?: Array<{
    id: string;
    title: string;
    type: string;
    priority: number;
    pageCount: number | null;
    sectionsCreated: number;
    model: {
      id: string;
      modelNumber: string;
      oem: string;
      productLine: string;
    };
  }>;
  // Legacy fields for backward compatibility
  manualId?: string;
  manual?: {
    id: string;
    title: string;
    pageCount: number | null;
    sectionsCreated: number;
    model: {
      id: string;
      modelNumber: string;
      oem: string;
      productLine: string;
    };
  };
  error?: string;
}

/**
 * Discover and ingest a manual automatically
 * 
 * @param oem - OEM name (e.g., "Carrier")
 * @param modelNumber - Model number (e.g., "19XR")
 * @returns Result with manual ID or error
 */
export async function discoverAndIngestManual(
  oem: string,
  modelNumber: string
): Promise<AutoIngestResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🤖 AUTO-INGEST: ${oem} ${modelNumber}`);
  console.log('='.repeat(60));

  // Track storage paths and manual IDs for cleanup on error
  const storagePaths: string[] = [];
  const manualIds: string[] = [];

  try {
    // Step 1: Check if manual already exists
    console.log('\n📋 Step 1: Checking database...');
    const existingManual = await findExistingManual(oem, modelNumber);

    if (existingManual) {
      console.log(`✅ Manual already exists: ${existingManual.title}`);
      return {
        success: true,
        manualId: existingManual.id,
        message: 'Manual already in database',
        manual: {
          id: existingManual.id,
          title: existingManual.title,
          pageCount: existingManual.pageCount,
          sectionsCreated: existingManual._count.sections,
          model: {
            id: existingManual.model.id,
            modelNumber: existingManual.model.modelNumber,
            oem: existingManual.model.productLine.oem.name,
            productLine: existingManual.model.productLine.name,
          },
        },
      };
    }

    console.log('⚠️  Manual not found in database');

    // Step 2: Search for manuals using Perplexity (find up to 5)
    console.log('\n🔍 Step 2: Searching with Perplexity...');
    const searchResult = await findAllManuals(oem, modelNumber);

    if (!searchResult.found || searchResult.manuals.length === 0) {
      console.log('❌ Perplexity could not find any valid manuals');
      return {
        success: false,
        message: 'Manual not found online',
        error: 'No direct-download PDF found from authorized sources',
      };
    }

    console.log(`✅ Found ${searchResult.manuals.length} manual(s):`);
    searchResult.manuals.forEach((m, i) => {
      console.log(`   ${i + 1}. [P${m.priority}] ${m.type.toUpperCase()}: ${m.title}`);
    });

    // Step 3-7: Process each manual
    const ingestedManuals: Array<{
      id: string;
      title: string;
      type: string;
      priority: number;
      pageCount: number | null;
      sectionsCreated: number;
      model: {
        id: string;
        modelNumber: string;
        oem: string;
        productLine: string;
      };
    }> = [];

    for (let i = 0; i < searchResult.manuals.length; i++) {
      const manualInfo = searchResult.manuals[i];
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`📖 Processing manual ${i + 1}/${searchResult.manuals.length}: ${manualInfo.type.toUpperCase()}`);
      console.log('─'.repeat(60));

      let currentStoragePath: string | null = null;
      let currentManualId: string | null = null;

      try {
        // Step 3: Download PDF
        console.log(`\n📥 Step 3.${i + 1}: Downloading PDF...`);
        const pdfBuffer = await downloadPDFFromWeb(manualInfo.pdfUrl);
        console.log(`✅ Downloaded: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB`);

        // Step 4: Upload to Supabase storage
        console.log(`\n☁️  Step 4.${i + 1}: Uploading to Supabase...`);
        currentStoragePath = await uploadToSupabase(pdfBuffer, oem, modelNumber, manualInfo.type);
        storagePaths.push(currentStoragePath);
        console.log(`✅ Uploaded to: ${currentStoragePath}`);

        // Step 5: Create database records
        console.log(`\n💾 Step 5.${i + 1}: Creating database records...`);
        currentManualId = await createManualRecord({
          oem,
          modelNumber,
          title: manualInfo.title,
          manualType: manualInfo.type,
          sourceUrl: manualInfo.pdfUrl,
          storagePath: currentStoragePath,
          pageCount: null, // Will be determined during processing
        });
        manualIds.push(currentManualId);
        console.log(`✅ Manual record created: ${currentManualId}`);

        // Step 6: Process PDF (extract, chunk, embed)
        console.log(`\n⚙️  Step 6.${i + 1}: Processing PDF...`);
        const processingResult = await processPDF(currentManualId, currentStoragePath);
        console.log(`✅ Processing complete:`);
        console.log(`   Pages: ${processingResult.pageCount}`);
        console.log(`   Sections: ${processingResult.sectionsCreated}`);

        // Step 7: Update manual status and fetch complete record
        const updatedManual = await prisma.manual.update({
          where: { id: currentManualId },
          data: {
            status: 'active',
            pageCount: processingResult.pageCount,
          },
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

        ingestedManuals.push({
          id: currentManualId,
          title: manualInfo.title,
          type: manualInfo.type,
          priority: manualInfo.priority,
          pageCount: processingResult.pageCount,
          sectionsCreated: processingResult.sectionsCreated,
          model: {
            id: updatedManual.model.id,
            modelNumber: updatedManual.model.modelNumber,
            oem: updatedManual.model.productLine.oem.name,
            productLine: updatedManual.model.productLine.name,
          },
        });

        console.log(`✅ Manual ${i + 1} complete!`);
      } catch (error: any) {
        console.error(`❌ Failed to process manual ${i + 1}:`, error.message);

        // Cleanup current manual's orphaned file
        if (currentStoragePath && !currentManualId) {
          try {
            await supabase.storage.from('manuals').remove([currentStoragePath]);
            console.log(`🧹 Cleaned up orphaned file: ${currentStoragePath}`);
          } catch (cleanupError) {
            console.error('Failed to cleanup orphaned file:', cleanupError);
          }
        }

        // Continue with next manual instead of failing entire process
        console.log(`⚠️  Skipping manual ${i + 1}, continuing with remaining manuals...`);
      }
    }

    if (ingestedManuals.length === 0) {
      throw new Error('Failed to ingest any manuals');
    }

    console.log(`\n🎉 AUTO-INGEST COMPLETE!`);
    console.log(`   Successfully ingested ${ingestedManuals.length}/${searchResult.manuals.length} manuals`);
    console.log('='.repeat(60));

    // Return all manuals + first one as legacy "manual" field
    return {
      success: true,
      manualIds,
      manuals: ingestedManuals,
      message: `Successfully discovered and added ${ingestedManuals.length} manual(s)`,
      // Legacy fields for backward compatibility (return highest priority manual)
      manualId: ingestedManuals[0].id,
      manual: ingestedManuals[0],
    };
  } catch (error: any) {
    console.error('\n❌ AUTO-INGEST FAILED:', error.message);
    console.error('='.repeat(60));

    // Cleanup: Delete orphaned files from Supabase storage
    if (storagePaths.length > 0) {
      console.log(`🧹 Cleaning up ${storagePaths.length} orphaned file(s)...`);
      try {
        await supabase.storage.from('manuals').remove(storagePaths);
        console.log(`✅ Deleted ${storagePaths.length} orphaned file(s)`);
      } catch (cleanupError) {
        console.error('⚠️  Failed to cleanup orphaned files:', cleanupError);
      }
    }

    return {
      success: false,
      message: 'Failed to discover or process manual',
      error: error.message,
    };
  }
}

/**
 * Extract product line name from manual title
 * Examples:
 *   "AquaEdge 19XR Service Manual" → "AquaEdge"
 *   "Infinity Series 25VNA8 Guide" → "Infinity"
 *   "Carrier 30XA Chiller Manual" → "General" (fallback)
 */
function extractProductLineFromTitle(title: string, modelNumber: string): string {
  // Remove common words
  const cleanTitle = title
    .replace(/service/gi, '')
    .replace(/manual/gi, '')
    .replace(/installation/gi, '')
    .replace(/guide/gi, '')
    .replace(/troubleshooting/gi, '')
    .replace(/technical/gi, '')
    .replace(/data/gi, '')
    .replace(/series/gi, '')
    .trim();

  // Remove model number from title
  const withoutModel = cleanTitle.replace(new RegExp(modelNumber, 'gi'), '').trim();

  // Extract first significant word (likely product line)
  const words = withoutModel.split(/\s+/).filter(word => word.length > 2);

  if (words.length > 0 && words[0].length >= 3) {
    // Capitalize first letter
    return words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
  }

  // Fallback to "General" if we can't extract
  return 'General';
}

/**
 * Check if manual already exists in database
 */
async function findExistingManual(oem: string, modelNumber: string) {
  const manual = await prisma.manual.findFirst({
    where: {
      model: {
        modelNumber: {
          contains: modelNumber,
          mode: 'insensitive',
        },
        productLine: {
          oem: {
            name: {
              contains: oem,
              mode: 'insensitive',
            },
          },
        },
      },
      status: 'active',
    },
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
  });

  return manual;
}

/**
 * Download PDF from web URL
 */
async function downloadPDFFromWeb(url: string): Promise<Buffer> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 60000, // 60 seconds
    maxContentLength: 100 * 1024 * 1024, // 100 MB
  });

  return Buffer.from(response.data);
}

/**
 * Upload PDF to Supabase storage
 */
async function uploadToSupabase(
  pdfBuffer: Buffer,
  oem: string,
  modelNumber: string,
  manualType: string = 'manual'
): Promise<string> {
  const filename = `${oem}-${modelNumber}-${manualType}-${Date.now()}.pdf`
    .replace(/[^a-zA-Z0-9.-]/g, '-')
    .toLowerCase();

  const { data, error } = await supabase.storage
    .from('manuals')
    .upload(filename, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  return data.path;
}

/**
 * Create OEM, ProductLine, Model, and Manual records
 */
async function createManualRecord(params: {
  oem: string;
  modelNumber: string;
  title: string;
  manualType?: string;
  sourceUrl: string;
  storagePath: string;
  pageCount: number | null;
}): Promise<string> {
  // Find or create OEM
  let oemRecord = await prisma.oEM.findFirst({
    where: { name: { equals: params.oem, mode: 'insensitive' } },
  });

  if (!oemRecord) {
    oemRecord = await prisma.oEM.create({
      data: {
        name: params.oem,
        vertical: 'HVAC',
        status: 'active',
      },
    });
  }

  // Find or create ProductLine
  // Try to extract product line from title (e.g., "AquaEdge 19XR" → "AquaEdge")
  const extractedProductLine = extractProductLineFromTitle(params.title, params.modelNumber);

  let productLine = await prisma.productLine.findFirst({
    where: {
      oemId: oemRecord.id,
      name: { equals: extractedProductLine, mode: 'insensitive' },
    },
  });

  if (!productLine) {
    productLine = await prisma.productLine.create({
      data: {
        oemId: oemRecord.id,
        name: extractedProductLine,
        category: 'HVAC',
      },
    });
    console.log(`   Created product line: ${extractedProductLine}`);
  }

  // Find or create Model
  let model = await prisma.model.findFirst({
    where: {
      productLineId: productLine.id,
      modelNumber: { equals: params.modelNumber, mode: 'insensitive' },
    },
  });

  if (!model) {
    model = await prisma.model.create({
      data: {
        productLineId: productLine.id,
        modelNumber: params.modelNumber,
      },
    });
  }

  // Create Manual
  const manual = await prisma.manual.create({
    data: {
      modelId: model.id,
      title: params.title,
      manualType: params.manualType || 'service', // Use provided type or default to service
      sourceUrl: params.sourceUrl,
      sourceType: 'oem',
      storagePath: params.storagePath,
      pageCount: params.pageCount,
      status: 'processing',
    },
  });

  return manual.id;
}

/**
 * Process PDF: extract, chunk, embed, store
 * Uses the existing, tested ingestion pipeline
 */
async function processPDF(manualId: string, storagePath: string) {
  // Import processing functions (these are already tested and working)
  const { processPDFManual } = await import('../ingestion/pdfProcessor');
  const { chunkPDFPages } = await import('../ingestion/chunker');
  const { embedTextChunks } = await import('../ingestion/embeddings');

  // 1. Extract text from PDF (downloads from Supabase storage automatically)
  console.log(`   Extracting text...`);
  const pdfResult = await processPDFManual(storagePath);

  // 2. Chunk pages
  console.log(`   Chunking text...`);
  const chunks = chunkPDFPages(pdfResult.pages);

  // 3. Generate embeddings
  console.log(`   Generating embeddings (${chunks.length} chunks)...`);
  const chunksWithEmbeddings = await embedTextChunks(chunks);

  // 4. Store in database using raw SQL (Prisma doesn't support vector types)
  console.log(`   Storing in database...`);
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

  return {
    pageCount: pdfResult.metadata.totalPages,
    sectionsCreated: chunksWithEmbeddings.length,
  };
}
