import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

/**
 * Get all OEMs
 * GET /api/oems
 */
export async function getOEMs(req: Request, res: Response, next: NextFunction) {
  try {
    const { vertical } = req.query;

    const oems = await prisma.oEM.findMany({
      where: {
        status: 'active',
        ...(vertical && { vertical: vertical as string }),
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        vertical: true,
        website: true,
        logoUrl: true,
        regionsSupported: true,
        status: true,
      },
    });

    return res.json({
      success: true,
      data: oems,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get OEM by ID
 * GET /api/oems/:id
 */
export async function getOEMById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const oem = await prisma.oEM.findUnique({
      where: { id },
      include: {
        productLines: {
          orderBy: {
            name: 'asc',
          },
        },
      },
    });

    if (!oem) {
      throw new AppError('OEM not found', 404, 'NOT_FOUND');
    }

    return res.json({
      success: true,
      data: oem,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get product lines for an OEM
 * GET /api/oems/:id/product-lines
 */
export async function getOEMProductLines(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { category } = req.query;

    // Verify OEM exists
    const oem = await prisma.oEM.findUnique({
      where: { id },
    });

    if (!oem) {
      throw new AppError('OEM not found', 404, 'NOT_FOUND');
    }

    const productLines = await prisma.productLine.findMany({
      where: {
        oemId: id,
        ...(category && { category: category as string }),
      },
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            models: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: productLines,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get models for a product line
 * GET /api/product-lines/:id/models
 */
export async function getProductLineModels(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { discontinued } = req.query;

    // Verify product line exists
    const productLine = await prisma.productLine.findUnique({
      where: { id },
      include: {
        oem: true,
      },
    });

    if (!productLine) {
      throw new AppError('Product line not found', 404, 'NOT_FOUND');
    }

    const models = await prisma.model.findMany({
      where: {
        productLineId: id,
        ...(discontinued !== undefined && { discontinued: discontinued === 'true' }),
      },
      orderBy: {
        modelNumber: 'asc',
      },
      include: {
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
        productLine: {
          id: productLine.id,
          name: productLine.name,
          category: productLine.category,
          oem: productLine.oem,
        },
        models,
      },
    });
  } catch (error) {
    next(error);
  }
}
