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
      where: { id: id as string },
      include: {
        productLines: {
          orderBy: {
            name: 'asc',
          },
        },
      },
    });

    if (!oem) {
      throw new AppError(404, 'NOT_FOUND');
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
      where: { id: id as string },
    });

    if (!oem) {
      throw new AppError(404, 'NOT_FOUND');
    }

    const productLines = await prisma.productLine.findMany({
      where: {
        oemId: id as string,
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

    // Verify product line exists and include taxonomy
    const productLine = await prisma.productLine.findUnique({
      where: { id: id as string },
      include: {
        oem: true,
        subCategory: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!productLine) {
      throw new AppError(404, 'NOT_FOUND');
    }

    const models = await prisma.model.findMany({
      where: {
        productLineId: id as string,
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
          subCategory: productLine.subCategory ? {
            id: productLine.subCategory.id,
            name: productLine.subCategory.name,
            slug: productLine.subCategory.slug,
            category: {
              id: productLine.subCategory.category.id,
              name: productLine.subCategory.category.name,
              slug: productLine.subCategory.category.slug,
            },
          } : null,
        },
        models,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get equipment categories for an OEM
 * GET /api/oems/:id/categories
 */
export async function getOEMCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    // Verify OEM exists
    const oem = await prisma.oEM.findUnique({
      where: { id: id as string },
    });

    if (!oem) {
      throw new AppError(404, 'NOT_FOUND');
    }

    const categories = await prisma.equipmentCategory.findMany({
      where: {
        oemId: id as string,
      },
      orderBy: {
        displayOrder: 'asc',
      },
      include: {
        _count: {
          select: {
            subCategories: true,
          },
        },
      },
    });

    // Count models for each category (through sub-categories and product lines)
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const modelCount = await prisma.model.count({
          where: {
            productLine: {
              subCategory: {
                categoryId: category.id,
              },
            },
          },
        });

        return {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          icon: category.icon,
          displayOrder: category.displayOrder,
          subCategoriesCount: category._count.subCategories,
          modelsCount: modelCount,
        };
      })
    );

    return res.json({
      success: true,
      data: categoriesWithCounts,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get sub-categories for an equipment category
 * GET /api/oems/categories/:id/sub-categories
 */
export async function getCategorySubCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    // Verify category exists
    const category = await prisma.equipmentCategory.findUnique({
      where: { id: id as string },
      include: {
        oem: true,
      },
    });

    if (!category) {
      throw new AppError(404, 'NOT_FOUND');
    }

    const subCategories = await prisma.equipmentSubCategory.findMany({
      where: {
        categoryId: id as string,
      },
      orderBy: {
        displayOrder: 'asc',
      },
      include: {
        _count: {
          select: {
            productLines: true,
          },
        },
      },
    });

    // Count models for each sub-category
    const subCategoriesWithCounts = await Promise.all(
      subCategories.map(async (subCategory) => {
        const modelCount = await prisma.model.count({
          where: {
            productLine: {
              subCategoryId: subCategory.id,
            },
          },
        });

        return {
          id: subCategory.id,
          name: subCategory.name,
          slug: subCategory.slug,
          description: subCategory.description,
          displayOrder: subCategory.displayOrder,
          productLinesCount: subCategory._count.productLines,
          modelsCount: modelCount,
        };
      })
    );

    return res.json({
      success: true,
      data: {
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          oem: category.oem,
        },
        subCategories: subCategoriesWithCounts,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get product lines for a sub-category
 * GET /api/oems/sub-categories/:id/product-lines
 */
export async function getSubCategoryProductLines(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    // Verify sub-category exists
    const subCategory = await prisma.equipmentSubCategory.findUnique({
      where: { id: id as string },
      include: {
        category: {
          include: {
            oem: true,
          },
        },
      },
    });

    if (!subCategory) {
      throw new AppError(404, 'NOT_FOUND');
    }

    const productLines = await prisma.productLine.findMany({
      where: {
        subCategoryId: id as string,
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
      data: {
        subCategory: {
          id: subCategory.id,
          name: subCategory.name,
          slug: subCategory.slug,
          category: {
            id: subCategory.category.id,
            name: subCategory.category.name,
            slug: subCategory.category.slug,
            oem: subCategory.category.oem,
          },
        },
        productLines,
      },
    });
  } catch (error) {
    next(error);
  }
}
