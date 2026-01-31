/**
 * Discovery Controller
 * Handles on-demand manual discovery and ingestion
 */

import { Request, Response } from 'express';
import { discoverAndIngestManual } from '@/services/discovery/autoIngest';
import { AppError } from '@/middleware/errorHandler';
import { prisma } from '@/config/database';
import { extractBaseModel, getModelSearchVariants } from '@/utils/modelNumber';

/**
 * Discover and ingest a manual on-demand
 * 
 * POST /api/discovery/manual
 * Body: { oem: string, modelNumber: string }
 */
export async function discoverManual(req: Request, res: Response) {
    try {
        const { oem, modelNumber } = req.body;

        // Validation
        if (!oem || !modelNumber) {
            throw new AppError(400, 'OEM and model number are required');
        }

        if (typeof oem !== 'string' || typeof modelNumber !== 'string') {
            throw new AppError(400, 'OEM and model number must be strings');
        }

        if (oem.length < 2 || oem.length > 50) {
            throw new AppError(400, 'OEM must be 2-50 characters');
        }

        if (modelNumber.length < 2 || modelNumber.length > 50) {
            throw new AppError(400, 'Model number must be 2-50 characters');
        }

        console.log(`\n📡 Discovery request: ${oem} ${modelNumber}`);

        // Execute auto-ingestion
        const result = await discoverAndIngestManual(oem, modelNumber);

        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: result.message,
                error: result.error,
            });
        }

        // Return success
        res.json({
            success: true,
            message: result.message,
            manual: result.manual,
        });
    } catch (error: any) {
        console.error('Error in discoverManual:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || 'Failed to discover manual',
        });
    }
}

/**
 * Search for a model and discover manual if not found
 * 
 * GET /api/discovery/search?oem=Carrier&model=19XR
 */
export async function searchWithDiscovery(req: Request, res: Response) {
    try {
        const oem = Array.isArray(req.query.oem) ? req.query.oem[0] : req.query.oem;
        const modelNumber = Array.isArray(req.query.model) ? req.query.model[0] : req.query.model;

        if (!modelNumber) {
            throw new AppError(400, 'model query parameter is required');
        }

        console.log(`🔍 Search: ${oem ? `${oem} ` : ''}${modelNumber}`);

        // Step 1: Multi-tier database search
        let existingManuals = await searchDatabase(oem as string | undefined, modelNumber as string);

        // Step 1.5: If no results and OEM provided, try extracting product line from query
        if (existingManuals.length === 0 && oem) {
            console.log('   Trying expanded search...');
            existingManuals = await searchDatabaseExpanded(oem as string, modelNumber as string);
        }

        if (existingManuals.length > 0) {
            console.log(`✅ Found ${existingManuals.length} manual(s) in database`);
            return res.json({
                success: true,
                source: 'database',
                manuals: existingManuals.map(m => ({
                    id: m.id,
                    title: m.title,
                    type: m.manualType,
                    pageCount: m.pageCount,
                    sectionsCount: m._count.sections,
                    model: {
                        id: m.model.id,
                        modelNumber: m.model.modelNumber,
                        oem: m.model.productLine.oem.name,
                        productLine: m.model.productLine.name,
                    },
                })),
            });
        }

        // Step 2: Manual not found - trigger discovery
        console.log('⚠️  Manual not found, triggering discovery...');

        // If no OEM provided, we can't do discovery (Perplexity needs OEM context)
        if (!oem) {
            return res.status(400).json({
                success: false,
                source: 'discovery',
                message: 'Please provide both OEM and model number for discovery',
                error: 'OEM is required for automatic manual discovery',
            });
        }

        const discoveryResult = await discoverAndIngestManual(oem as string, modelNumber as string);

        if (!discoveryResult.success) {
            return res.status(404).json({
                success: false,
                source: 'discovery',
                message: 'Manual not found in database or online',
                error: discoveryResult.error,
            });
        }

        // Return newly discovered manual
        res.json({
            success: true,
            source: 'discovery',
            message: '🎉 We just added this manual to our database!',
            manual: discoveryResult.manual,
        });
    } catch (error: any) {
        console.error('Error in searchWithDiscovery:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || 'Failed to search or discover manual',
        });
    }
}

/**
 * Get discovery status for a manual
 * 
 * GET /api/discovery/status/:manualId
 */
export async function getDiscoveryStatus(req: Request, res: Response) {
    try {
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
            id: manual.id,
            status: manual.status,
            title: manual.title,
            pageCount: manual.pageCount,
            sectionsProcessed: manual._count.sections,
            sourceUrl: manual.sourceUrl,
            createdAt: manual.createdAt,
        });
    } catch (error: any) {
        console.error('Error in getDiscoveryStatus:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || 'Failed to get discovery status',
        });
    }
}

/**
 * Helper: Multi-tier database search with smart model extraction
 */
async function searchDatabase(oem: string | undefined, modelNumber: string) {
    // Extract base model and get all search variants
    // Example: "50P3C070540GMYCSDJ" → ["50P3C070540GMYCSDJ", "50P3"]
    const searchVariants = getModelSearchVariants(modelNumber);
    const baseModel = extractBaseModel(modelNumber);
    
    if (baseModel !== modelNumber) {
        console.log(`   📝 Base model: ${baseModel} from ${modelNumber}`);
        console.log(`   🔍 Search variants: ${searchVariants.join(', ')}`);
    }

    const whereClause: any = {
        status: 'active',
    };

    // Build OR conditions for all model variants
    const modelConditions = searchVariants.map(variant => ({
        modelNumber: {
            equals: variant,
            mode: 'insensitive',
        },
    }));

    // Also try partial match on base model (e.g., "50P3" should match "50P3A", "50P3B")
    if (baseModel && baseModel.length >= 3) {
        modelConditions.push({
            modelNumber: {
                startsWith: baseModel,
                mode: 'insensitive',
            },
        });
    }

    // Tier 1: If OEM provided, search with both OEM + model
    if (oem) {
        whereClause.model = {
            OR: modelConditions,
            productLine: {
                oem: {
                    name: {
                        contains: oem,
                        mode: 'insensitive',
                    },
                },
            },
        };
    } else {
        // Tier 2: Model-only search (if OEM not provided)
        whereClause.model = {
            OR: modelConditions,
        };
    }

    const manuals = await prisma.manual.findMany({
        where: whereClause,
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
        take: 10, // Limit results
    });

    return manuals;
}

/**
 * Helper: Expanded search (includes product line, manual title)
 */
async function searchDatabaseExpanded(oem: string, modelNumber: string) {
    // Search by:
    // 1. OEM name
    // 2. Model number in modelNumber field OR in variants
    // 3. Product line name (e.g., "AquaEdge")
    // 4. Manual title

    const manuals = await prisma.manual.findMany({
        where: {
            status: 'active',
            OR: [
                // Standard search
                {
                    model: {
                        modelNumber: { contains: modelNumber, mode: 'insensitive' },
                        productLine: {
                            oem: { name: { contains: oem, mode: 'insensitive' } },
                        },
                    },
                },
                // Search by product line name (e.g., user searches "Carrier AquaEdge")
                {
                    model: {
                        productLine: {
                            name: { contains: modelNumber, mode: 'insensitive' },
                            oem: { name: { contains: oem, mode: 'insensitive' } },
                        },
                    },
                },
                // Search in manual title (e.g., "AquaEdge 19XR Service Manual")
                {
                    title: { contains: modelNumber, mode: 'insensitive' },
                    model: {
                        productLine: {
                            oem: { name: { contains: oem, mode: 'insensitive' } },
                        },
                    },
                },
                // Search by model variants (if user enters variant like "19XR-0500")
                {
                    model: {
                        variants: { has: modelNumber },
                        productLine: {
                            oem: { name: { contains: oem, mode: 'insensitive' } },
                        },
                    },
                },
            ],
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
        take: 10,
    });

    return manuals;
}
