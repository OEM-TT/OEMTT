import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

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
