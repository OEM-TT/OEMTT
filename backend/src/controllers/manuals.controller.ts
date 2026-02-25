import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { supabase } from '../config/supabase';
import { processPDFManual } from '../services/ingestion/pdfProcessor';
import { chunkPDFPages } from '../services/ingestion/chunker';
import { embedTextChunks } from '../services/ingestion/embeddings';

/**
 * Get manual by ID
 * GET /api/manuals/:id
 */
export async function getManualById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const manual = await prisma.manual.findUnique({
      where: { id: id as string },
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
          select: {
            sections: true,
          },
        },
      },
    });

    if (!manual) {
      throw new AppError(404, 'NOT_FOUND');
    }

    return res.json({
      success: true,
      data: manual,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get sections for a manual
 * GET /api/manuals/:id/sections
 */
export async function getManualSections(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { type, page, limit = '50' } = req.query;

    // Verify manual exists
    const manual = await prisma.manual.findUnique({
      where: { id: id as string },
      select: {
        id: true,
        title: true,
        revision: true,
        model: {
          select: {
            modelNumber: true,
          },
        },
      },
    });

    if (!manual) {
      throw new AppError(404, 'NOT_FOUND');
    }

    const limitNum = parseInt(limit as string, 10);
    const pageNum = page ? parseInt(page as string, 10) : undefined;

    const sections = await prisma.manualSection.findMany({
      where: {
        manualId: id as string,
        ...(type && { sectionType: type as string }),
        ...(pageNum && { pageReference: { contains: pageNum.toString() } }),
      },
      take: limitNum,
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        sectionTitle: true,
        sectionType: true,
        content: true,
        pageReference: true,
        metadata: true,
        createdAt: true,
      },
    });

    return res.json({
      success: true,
      data: {
        manual: {
          id: manual.id,
          title: manual.title,
          revision: manual.revision,
          modelNumber: manual.model.modelNumber,
        },
        sections,
        count: sections.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Search manual sections by content
 * GET /api/manuals/search-sections?q=<query>
 */
export async function searchManualSections(req: Request, res: Response, next: NextFunction) {
  try {
    const { q, modelId, type, limit = '20' } = req.query;

    if (!q || typeof q !== 'string') {
      throw new AppError(400, 'VALIDATION_ERROR');
    }

    const searchQuery = q.trim();
    const limitNum = parseInt(limit as string, 10);

    // Build where clause
    const where: any = {
      content: {
        contains: searchQuery,
        mode: 'insensitive',
      },
    };

    if (modelId) {
      where.manual = {
        modelId: modelId as string,
        status: 'active',
      };
    }

    if (type) {
      where.sectionType = type as string;
    }

    const sections = await prisma.manualSection.findMany({
      where,
      take: limitNum,
      include: {
        manual: {
          select: {
            id: true,
            title: true,
            manualType: true,
            revision: true,
            confidenceScore: true,
            model: {
              select: {
                id: true,
                modelNumber: true,
                productLine: {
                  select: {
                    name: true,
                    oem: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json({
      success: true,
      data: {
        query: searchQuery,
        count: sections.length,
        sections,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Upload and process a new manual
 * POST /api/manuals/upload
 * Multipart form data: pdf (file), modelId, manualType, title
 */
export async function uploadManual(req: Request, res: Response, next: NextFunction) {
  try {
    const { modelId, manualType, title } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No PDF file provided',
      });
    }

    if (!modelId || !manualType || !title) {
      return res.status(400).json({
        success: false,
        error: 'modelId, manualType, and title are required',
      });
    }

    // Verify model exists
    const model = await prisma.model.findUnique({
      where: { id: modelId },
      include: {
        productLine: {
          include: {
            oem: true,
            subCategory: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'Model not found',
      });
    }

    console.log(`📤 Uploading manual for ${model.productLine.oem.name} ${model.modelNumber}`);
    console.log(`   Type: ${manualType}, Size: ${(file.size / 1024).toFixed(2)} KB`);

    // Generate storage path: {oem}/{product_line}/{filename}.pdf
    const oem = model.productLine.oem.name;
    const productLine = model.productLine.name;
    const filename = file.originalname || `${model.modelNumber}-${manualType}.pdf`;
    const storagePath = `${oem}/${productLine}/${filename}`;

    // Upload to Supabase Storage
    console.log(`   ☁️  Uploading to storage: ${storagePath}`);
    const { error: uploadError } = await supabase.storage
      .from('manuals')
      .upload(storagePath, file.buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Storage upload failed:', uploadError);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload PDF to storage',
      });
    }

    // Create manual record
    console.log(`   💾 Creating manual record...`);
    const manual = await prisma.manual.create({
      data: {
        modelId,
        title,
        manualType,
        storagePath,
        pageCount: 0, // Will be updated after processing
        sourceUrl: null,
      },
    });

    console.log(`✅ Manual uploaded: ${manual.id}`);

    // Trigger background processing (don't await - let it run async)
    processManualInBackground(manual.id).catch((error) => {
      console.error(`❌ Background processing failed for manual ${manual.id}:`, error);
    });

    return res.status(201).json({
      success: true,
      manual: {
        id: manual.id,
        title: manual.title,
        manualType: manual.manualType,
        storagePath: manual.storagePath,
      },
      message: 'Manual uploaded successfully. Processing in background...',
    });
  } catch (error) {
    console.error('Upload error:', error);
    next(error);
  }
}

/**
 * Process manual in the background
 * This function runs asynchronously after upload
 */
async function processManualInBackground(manualId: string) {
  try {
    console.log(`\n🔄 Starting background processing for manual ${manualId}...`);

    const manual = await prisma.manual.findUnique({
      where: { id: manualId },
    });

    if (!manual) {
      throw new Error('Manual not found');
    }

    if (!manual.storagePath) {
      throw new Error('Manual has no storage path');
    }

    // Update status to processing
    await prisma.manual.update({
      where: { id: manualId },
      data: { pageCount: 0 }, // Use pageCount = 0 to indicate processing
    });

    // Step 1: Extract text from PDF
    console.log(`\n⚙️  Step 1: Extracting text from PDF...`);
    const pdfResult = await processPDFManual(manual.storagePath);

    // Update page count
    await prisma.manual.update({
      where: { id: manualId },
      data: { pageCount: pdfResult.metadata.totalPages },
    });

    // Step 2: Chunk text
    console.log(`\n⚙️  Step 2: Chunking text into sections...`);
    const chunks = chunkPDFPages(pdfResult.pages);

    console.log(`\n📊 Chunking Stats:`);
    console.log(`   Total chunks: ${chunks.length}`);
    console.log(`   Avg tokens/chunk: ${Math.round(chunks.reduce((sum, c) => sum + c.tokenCount, 0) / chunks.length)}`);

    // Step 3: Generate embeddings
    console.log(`\n⚙️  Step 3: Generating embeddings...`);
    const embeddedChunks = await embedTextChunks(chunks);

    // Step 4: Store sections in database using raw SQL (Prisma doesn't support vector types)
    console.log(`\n⚙️  Step 4: Storing ${embeddedChunks.length} sections in database...`);
    
    for (let i = 0; i < embeddedChunks.length; i++) {
      const chunk = embeddedChunks[i];
      
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

      // Log progress every 20 chunks
      if ((i + 1) % 20 === 0 || i === embeddedChunks.length - 1) {
        console.log(`   Progress: ${i + 1}/${embeddedChunks.length} sections stored`);
      }
    }

    console.log(`\n✅ Manual processing complete for ${manualId}!`);
    console.log(`   Total sections: ${embeddedChunks.length}`);

    // Update manual status to active and set page count
    await prisma.manual.update({
      where: { id: manualId },
      data: { 
        status: 'active',
        pageCount: pdfResult.metadata.totalPages 
      },
    });
    console.log(`   ✅ Manual status updated to 'active'`);

  } catch (error) {
    console.error(`❌ Background processing failed for manual ${manualId}:`, error);
    // Update manual status to failed
    await prisma.manual.update({
      where: { id: manualId },
      data: { 
        status: 'failed',
        pageCount: -1 
      },
    }).catch(console.error);
  }
}

/**
 * Get manual processing status
 * GET /api/manuals/:id/status
 */
export async function getManualStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const manual = await prisma.manual.findUnique({
      where: { id: id as string },
      select: {
        id: true,
        title: true,
        pageCount: true,
        status: true,
        sections: {
          select: { id: true },
        },
      },
    });

    if (!manual) {
      return res.status(404).json({
        success: false,
        error: 'Manual not found',
      });
    }

    const sectionsCount = manual.sections.length;
    let status = 'complete';
    let progress = 100;

    if (manual.pageCount === 0) {
      status = 'processing';
      progress = sectionsCount > 0 ? 50 : 10; // Rough estimate
    } else if (manual.pageCount === -1) {
      status = 'failed';
      progress = 0;
    } else if (sectionsCount === 0) {
      status = 'processing';
      progress = 30;
    }

    return res.json({
      success: true,
      status,
      progress,
      manual: {
        id: manual.id,
        title: manual.title,
        pageCount: manual.pageCount,
        sectionsCount,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update manual (e.g., change manual type)
 */
export async function updateManual(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { manualType, title, revision } = req.body;

    const manual = await prisma.manual.findUnique({
      where: { id: id as string },
    });

    if (!manual) {
      return res.status(404).json({
        success: false,
        error: 'Manual not found',
      });
    }

    const updatedManual = await prisma.manual.update({
      where: { id: id as string },
      data: {
        ...(manualType && { manualType }),
        ...(title && { title }),
        ...(revision && { revision }),
      },
    });

    return res.json({
      success: true,
      manual: updatedManual,
    });
  } catch (error) {
    console.error('Error updating manual:', error);
    next(error);
  }
}

/**
 * Delete manual (including from storage and sections)
 */
export async function deleteManual(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const manual = await prisma.manual.findUnique({
      where: { id: id as string },
    });

    if (!manual) {
      return res.status(404).json({
        success: false,
        error: 'Manual not found',
      });
    }

    // Delete from Supabase storage if it exists
    if (manual.storagePath) {
      try {
        const { error } = await supabase.storage
          .from('manuals')
          .remove([manual.storagePath]);
        
        if (error) {
          console.error('Error deleting from storage:', error);
          // Continue with database deletion even if storage deletion fails
        }
      } catch (storageError) {
        console.error('Storage deletion error:', storageError);
        // Continue with database deletion
      }
    }

    // Delete manual (sections will be cascaded by Prisma)
    await prisma.manual.delete({
      where: { id: id as string },
    });

    return res.json({
      success: true,
      message: 'Manual deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting manual:', error);
    next(error);
  }
}
