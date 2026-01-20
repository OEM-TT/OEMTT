import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

/**
 * Search models by model number or serial number
 * GET /api/models/search?q=<query>
 */
export async function searchModels(req: Request, res: Response, next: NextFunction) {
  try {
    const { q, limit = '20' } = req.query;

    if (!q || typeof q !== 'string') {
      throw new AppError('Search query is required', 400, 'VALIDATION_ERROR');
    }

    const searchQuery = q.trim();
    const limitNum = parseInt(limit as string, 10);

    // Search by model number (case-insensitive partial match)
    const models = await prisma.model.findMany({
      where: {
        OR: [
          {
            modelNumber: {
              contains: searchQuery,
              mode: 'insensitive',
            },
          },
          {
            variants: {
              hasSome: [searchQuery],
            },
          },
        ],
        discontinued: false,
      },
      take: limitNum,
      orderBy: {
        modelNumber: 'asc',
      },
      include: {
        productLine: {
          include: {
            oem: {
              select: {
                id: true,
                name: true,
                vertical: true,
                logoUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            manuals: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: {
        query: searchQuery,
        count: models.length,
        models,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get model by ID
 * GET /api/models/:id
 */
export async function getModelById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const model = await prisma.model.findUnique({
      where: { id },
      include: {
        productLine: {
          include: {
            oem: true,
          },
        },
        manuals: {
          where: {
            status: 'active',
          },
          orderBy: [
            { confidenceScore: 'desc' },
            { publishDate: 'desc' },
          ],
        },
        _count: {
          select: {
            savedUnits: true,
          },
        },
      },
    });

    if (!model) {
      throw new AppError('Model not found', 404, 'NOT_FOUND');
    }

    return res.json({
      success: true,
      data: model,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get manuals for a model
 * GET /api/models/:id/manuals
 */
export async function getModelManuals(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { type, status = 'active' } = req.query;

    // Verify model exists
    const model = await prisma.model.findUnique({
      where: { id },
      include: {
        productLine: {
          include: {
            oem: true,
          },
        },
      },
    });

    if (!model) {
      throw new AppError('Model not found', 404, 'NOT_FOUND');
    }

    const manuals = await prisma.manual.findMany({
      where: {
        modelId: id,
        status: status as string,
        ...(type && { manualType: type as string }),
      },
      orderBy: [
        { confidenceScore: 'desc' },
        { publishDate: 'desc' },
      ],
    });

    return res.json({
      success: true,
      data: {
        model: {
          id: model.id,
          modelNumber: model.modelNumber,
          productLine: model.productLine.name,
          oem: model.productLine.oem.name,
        },
        manuals,
      },
    });
  } catch (error) {
    next(error);
  }
}
