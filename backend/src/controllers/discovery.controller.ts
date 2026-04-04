/**
 * Discovery Controller
 * Handles on-demand manual discovery and ingestion
 */

import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth';
import { discoverAndIngestManual } from '@/services/discovery/autoIngest';
import { AppError } from '@/middleware/errorHandler';
import { prisma } from '@/config/database';
import { extractBaseModel, getModelSearchVariants } from '@/utils/modelNumber';
import { env } from '@/config/env';

/**
 * Discover and ingest a manual on-demand
 * 
 * POST /api/discovery/manual
 * Body: { oem: string, modelNumber: string }
 */
export async function discoverManual(req: AuthRequest, res: Response) {
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
export async function searchWithDiscovery(req: AuthRequest, res: Response) {
    const searchStartTime = Date.now();
    try {
        const oem = Array.isArray(req.query.oem) ? req.query.oem[0] : req.query.oem;
        const modelNumber = Array.isArray(req.query.model) ? req.query.model[0] : req.query.model;
        const userId = req.user!.id;

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
            // Group manuals by model and score matches
            const modelGroups = groupAndScoreManuals(existingManuals, modelNumber as string);
            
            // If multiple models found (and especially if no OEM specified), return all matches
            const uniqueModelCount = modelGroups.length;
            if (uniqueModelCount > 1) {
                console.log(`✅ Found ${uniqueModelCount} matching models:`, 
                    modelGroups.map(g => `${g.model.productLine.oem.name} ${g.model.modelNumber} (score: ${g.matchScore})`).join(', ')
                );
            }
            console.log(`✅ Found ${existingManuals.length} manual(s) in database`);

            // Track successful database search
            await trackSearch({
                userId,
                oemName: oem as string || 'Unknown',
                modelNumber: modelNumber as string,
                searchType: 'database',
                foundInDatabase: true,
                usedPerplexity: false,
                manualsFound: existingManuals.length,
                processingTimeMs: Date.now() - searchStartTime,
            });

            // Return flattened list of manuals (frontend will group if needed)
            // Include match score for each model
            return res.json({
                success: true,
                source: 'database',
                matchType: uniqueModelCount > 1 ? 'multiple_models' : 'single_model',
                modelCount: uniqueModelCount,
                manuals: existingManuals.map(m => {
                    // Find match score for this model
                    const modelGroup = modelGroups.find(g => g.model.id === m.model.id);
                    return {
                        id: m.id,
                        title: m.title,
                        type: m.manualType,
                        pageCount: m.pageCount,
                        sectionsCount: m._count.sections,
                        sourceUrl: m.sourceUrl,
                        storagePath: m.storagePath,
                        model: {
                            id: m.model.id,
                            modelNumber: m.model.modelNumber,
                            oem: m.model.productLine.oem.name,
                            productLine: m.model.productLine.name,
                            category: m.model.productLine.category,
                            matchScore: modelGroup?.matchScore || 0,
                        },
                    };
                }),
            });
        }

        // Step 2: Manual not found - check if discovery is enabled
        console.log('⚠️  Manual not found in database');

        // Check if Perplexity discovery is enabled
        if (!env.ENABLE_PERPLEXITY_DISCOVERY) {
            console.log('📝 Perplexity discovery disabled - creating stub model & model request');

            const oemName = oem as string || 'Unknown';
            const modelNum = modelNumber as string;
            
            // Create or increment model request
            try {
                const existingRequest = await prisma.modelRequest.findFirst({
                    where: {
                        oemName: { equals: oemName, mode: 'insensitive' },
                        modelNumber: { equals: modelNum, mode: 'insensitive' },
                    },
                });

                if (existingRequest) {
                    await prisma.modelRequest.update({
                        where: { id: existingRequest.id },
                        data: {
                            requestCount: { increment: 1 },
                            lastRequestedAt: new Date(),
                        },
                    });
                    console.log(`   ✅ Incremented request count for ${oemName} ${modelNum} (now ${existingRequest.requestCount + 1}x)`);
                } else {
                    const userExists = await prisma.user.findUnique({
                        where: { id: userId },
                        select: { id: true },
                    });

                    await prisma.modelRequest.create({
                        data: {
                            oemName,
                            modelNumber: modelNum,
                            userId: userExists ? userId : null,
                            requestCount: 1,
                        },
                    });
                    console.log(`   ✅ Created new model request for ${oemName} ${modelNum}`);
                }
            } catch (error) {
                console.error('⚠️  Failed to record model request:', error);
            }

            // Create stub OEM → ProductLine → Model so the user can save a unit
            let stubModel: any = null;
            try {
                stubModel = await findOrCreateStubModel(oemName, modelNum);
                console.log(`   ✅ Stub model ready: ${stubModel.id}`);
            } catch (error) {
                console.error('⚠️  Failed to create stub model:', error);
            }

            // Track as failed search (for analytics)
            await trackSearch({
                userId,
                oemName,
                modelNumber: modelNum,
                searchType: 'failed',
                foundInDatabase: false,
                usedPerplexity: false,
                manualsFound: 0,
                processingTimeMs: Date.now() - searchStartTime,
                errorMessage: 'Model not found - stub created',
            });

            // Return 200 with stub model so frontend can offer to save
            return res.json({
                success: true,
                source: 'pending',
                message: "We don't have manuals for this model yet, but we've recorded your request! You can still save this model to your site and chat about it using web search.",
                manuals: [],
                stubModel: stubModel ? {
                    id: stubModel.id,
                    modelNumber: stubModel.modelNumber,
                    oem: stubModel.productLine.oem.name,
                    productLine: stubModel.productLine.name,
                    category: stubModel.productLine.category,
                } : null,
            });
        }

        // Step 3: Perplexity discovery is enabled - trigger it
        console.log('🔍 Perplexity discovery enabled - triggering automatic discovery...');

        // If no OEM provided, we can't do discovery (Perplexity needs OEM context)
        if (!oem) {
            // Track failed search (no OEM)
            await trackSearch({
                userId,
                oemName: 'Unknown',
                modelNumber: modelNumber as string,
                searchType: 'failed',
                foundInDatabase: false,
                usedPerplexity: false,
                manualsFound: 0,
                processingTimeMs: Date.now() - searchStartTime,
                errorMessage: 'OEM is required for automatic manual discovery',
            });

            return res.status(400).json({
                success: false,
                source: 'discovery',
                message: 'Please provide both OEM and model number for discovery',
                error: 'OEM is required for automatic manual discovery',
            });
        }

        const discoveryResult = await discoverAndIngestManual(oem as string, modelNumber as string);

        if (!discoveryResult.success) {
            // Track failed Perplexity search
            await trackSearch({
                userId,
                oemName: oem as string,
                modelNumber: modelNumber as string,
                searchType: 'failed',
                foundInDatabase: false,
                usedPerplexity: true,
                manualsFound: 0,
                processingTimeMs: Date.now() - searchStartTime,
                errorMessage: discoveryResult.error,
            });

            return res.status(404).json({
                success: false,
                source: 'discovery',
                message: 'Manual not found in database or online',
                error: discoveryResult.error,
            });
        }

        // Track successful Perplexity search
        await trackSearch({
            userId,
            oemName: oem as string,
            modelNumber: modelNumber as string,
            searchType: 'perplexity',
            foundInDatabase: false,
            usedPerplexity: true,
            manualsFound: discoveryResult.manual ? 1 : 0,
            processingTimeMs: Date.now() - searchStartTime,
        });

        // Return newly discovered manual
        res.json({
            success: true,
            source: 'discovery',
            message: '🎉 We just added this manual to our database!',
            manual: discoveryResult.manual,
        });
    } catch (error: any) {
        console.error('Error in searchWithDiscovery:', error);

        // Track error
        try {
            const userId = req.user?.id;
            const oem = Array.isArray(req.query.oem) ? req.query.oem[0] : req.query.oem;
            const modelNumber = Array.isArray(req.query.model) ? req.query.model[0] : req.query.model;

            if (userId && modelNumber) {
                await trackSearch({
                    userId,
                    oemName: oem as string || 'Unknown',
                    modelNumber: modelNumber as string,
                    searchType: 'failed',
                    foundInDatabase: false,
                    usedPerplexity: false,
                    manualsFound: 0,
                    processingTimeMs: Date.now() - searchStartTime,
                    errorMessage: error.message || 'Unknown error',
                });
            }
        } catch (trackError) {
            console.error('Failed to track search error:', trackError);
        }

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
/**
 * Get popular searches based on actual user search data
 * GET /api/discovery/popular
 */
export async function getPopularSearches(req: AuthRequest, res: Response) {
    try {
        // Get searches from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const searches = await prisma.search.findMany({
            where: {
                createdAt: { gte: thirtyDaysAgo },
                manualsFound: { gt: 0 }, // Only successful searches
            },
            select: {
                oemName: true,
                modelNumber: true,
            },
        });

        // Count occurrences
        const searchCounts: Record<string, { oem: string; model: string; count: number }> = {};

        searches.forEach((s: { oemName: string; modelNumber: string }) => {
            const key = `${s.oemName}|${s.modelNumber}`;
            if (!searchCounts[key]) {
                searchCounts[key] = { oem: s.oemName, model: s.modelNumber, count: 0 };
            }
            searchCounts[key].count++;
        });

        // Sort by count and take top 10
        const popular = Object.values(searchCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .map(item => ({
                displayText: `${item.oem} ${item.model}`,
                oem: item.oem,
                model: item.model,
                searchCount: item.count,
            }));

        res.json({
            success: true,
            data: popular,
        });
    } catch (error: any) {
        console.error('Error fetching popular searches:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch popular searches',
        });
    }
}

export async function getDiscoveryStatus(req: AuthRequest, res: Response) {
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
    const modelConditions: any[] = searchVariants.map(variant => ({
        modelNumber: {
            equals: variant,
            mode: 'insensitive',
        },
    }));

    // Also try partial match on base model (e.g., "50P3" should match "50P3A", "50P3B")
    // Using 'contains' instead of 'startsWith' for case-insensitive support
    if (baseModel && baseModel.length >= 3) {
        modelConditions.push({
            modelNumber: {
                contains: baseModel,
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

/**
 * Helper: Group manuals by model and calculate match scores
 * Returns models sorted by best match score
 */
function groupAndScoreManuals(manuals: any[], searchQuery: string) {
    const modelMap = new Map();
    const queryUpper = searchQuery.toUpperCase();
    const baseModel = extractBaseModel(searchQuery);
    
    for (const manual of manuals) {
        const modelId = manual.model.id;
        const modelNumber = manual.model.modelNumber;
        
        if (!modelMap.has(modelId)) {
            // Calculate match score for this model
            const modelUpper = modelNumber.toUpperCase();
            let score = 0;
            
            // Exact match (highest priority)
            if (modelUpper === queryUpper) {
                score = 100;
            }
            // Base model exact match
            else if (baseModel && modelUpper === baseModel.toUpperCase()) {
                score = 90;
            }
            // Starts with query
            else if (modelUpper.startsWith(queryUpper)) {
                score = 80;
            }
            // Starts with base model
            else if (baseModel && modelUpper.startsWith(baseModel.toUpperCase())) {
                score = 70;
            }
            // Contains query
            else if (modelUpper.includes(queryUpper)) {
                score = 60;
            }
            // Contains base model
            else if (baseModel && modelUpper.includes(baseModel.toUpperCase())) {
                score = 50;
            }
            // Fuzzy match (partial overlap)
            else {
                // Calculate character overlap
                const overlap = calculateOverlap(modelUpper, queryUpper);
                score = Math.min(40, overlap * 10);
            }
            
            modelMap.set(modelId, {
                model: manual.model,
                manuals: [manual],
                matchScore: score,
                totalSections: manual._count?.sections || 0,
                totalPages: manual.pageCount || 0,
            });
        } else {
            // Add manual to existing model group
            const group = modelMap.get(modelId);
            group.manuals.push(manual);
            group.totalSections += manual._count?.sections || 0;
            group.totalPages += manual.pageCount || 0;
        }
    }
    
    // Convert map to array and sort by match score
    return Array.from(modelMap.values())
        .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Helper: Calculate character overlap between two strings
 */
function calculateOverlap(str1: string, str2: string): number {
    const shorter = str1.length < str2.length ? str1 : str2;
    const longer = str1.length < str2.length ? str2 : str1;
    
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
        if (longer.includes(shorter[i])) {
            matches++;
        }
    }
    
    return matches / shorter.length;
}

/**
 * Helper: Find or create a stub OEM → ProductLine → Model for manual-less models.
 * Allows users to save and chat about models before manuals are available.
 */
async function findOrCreateStubModel(oemName: string, modelNum: string) {
    // 1. Find or create OEM
    let oemRecord = await prisma.oEM.findFirst({
        where: { name: { equals: oemName, mode: 'insensitive' } },
    });

    if (!oemRecord) {
        oemRecord = await prisma.oEM.create({
            data: {
                name: oemName,
                vertical: 'HVAC',
                status: 'active',
            },
        });
        console.log(`   📝 Created stub OEM: ${oemRecord.name}`);
    }

    // 2. Find or create a generic product line for this OEM
    let productLine = await prisma.productLine.findFirst({
        where: {
            oemId: oemRecord.id,
            category: 'General',
        },
    });

    if (!productLine) {
        productLine = await prisma.productLine.create({
            data: {
                oemId: oemRecord.id,
                name: 'General',
                category: 'General',
            },
        });
        console.log(`   📝 Created stub product line for ${oemRecord.name}`);
    }

    // 3. Find or create the model
    let model = await prisma.model.findFirst({
        where: {
            productLineId: productLine.id,
            modelNumber: { equals: modelNum, mode: 'insensitive' },
        },
        include: {
            productLine: {
                include: { oem: true },
            },
        },
    });

    if (!model) {
        model = await prisma.model.create({
            data: {
                productLineId: productLine.id,
                modelNumber: modelNum,
            },
            include: {
                productLine: {
                    include: { oem: true },
                },
            },
        });
        console.log(`   📝 Created stub model: ${modelNum}`);
    }

    return model;
}

/**
 * Helper: Track search in analytics
 */
async function trackSearch(data: {
    userId: string;
    oemName: string;
    modelNumber: string;
    searchType: string;
    foundInDatabase: boolean;
    usedPerplexity: boolean;
    manualsFound: number;
    processingTimeMs: number;
    errorMessage?: string;
}) {
    try {
        // Look up the internal database user ID
        const dbUser = await prisma.user.findUnique({
            where: { supabaseUserId: data.userId },
            select: { id: true },
        });

        if (!dbUser) {
            console.warn('⚠️  User not found for search tracking');
            return;
        }

        await prisma.search.create({
            data: {
                userId: dbUser.id,
                oemName: data.oemName,
                modelNumber: data.modelNumber,
                searchType: data.searchType,
                foundInDatabase: data.foundInDatabase,
                usedPerplexity: data.usedPerplexity,
                manualsFound: data.manualsFound,
                processingTimeMs: data.processingTimeMs,
                errorMessage: data.errorMessage || null,
            },
        });

        console.log(`📊 Search tracked: ${data.searchType} (${data.manualsFound} found)`);
    } catch (error: any) {
        console.error('⚠️  Failed to track search:', error.message);
        // Don't throw - tracking shouldn't fail the request
    }
}
