import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import slugify from 'slugify';

/**
 * Get full taxonomy tree for dashboard
 * Returns: OEMs → Categories → Sub-Categories → Product Lines → Models
 */
export async function getTaxonomyTree(req: Request, res: Response, next: NextFunction) {
  try {
    // Get all OEMs with their relationships
    const oems = await prisma.oEM.findMany({
      include: {
        equipmentCategories: {
          include: {
            subCategories: {
              include: {
                productLines: {
                  include: {
                    models: {
                      include: {
                        _count: {
                          select: { manuals: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Format response with manual counts
    // Wrap OEMs in an "HVAC" industry for UI consistency
    const formattedData = {
      industries: [
        {
          id: 'hvac',
          name: 'HVAC',
          slug: 'hvac',
          oems: oems.map((oem) => ({
            id: oem.id,
            name: oem.name,
            categories: oem.equipmentCategories.map((category) => ({
              id: category.id,
              name: category.name,
              slug: category.slug,
              subCategories: category.subCategories.map((sub) => ({
                id: sub.id,
                name: sub.name,
                slug: sub.slug,
                productLines: sub.productLines.map((line) => ({
                  id: line.id,
                  name: line.name,
                  slug: line.slug,
                  models: line.models.map((model) => ({
                    id: model.id,
                    modelNumber: model.modelNumber,
                    manualCount: model._count.manuals,
                    discontinued: model.discontinued,
                  })),
                })),
              })),
            })),
          })),
        },
      ],
    };

    return res.json({
      success: true,
      ...formattedData,
    });
  } catch (error) {
    console.error('Error fetching taxonomy tree:', error);
    next(error);
  }
}

/**
 * Create new equipment category
 */
export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { oemId, name, description } = req.body;

    if (!oemId || !name) {
      return res.status(400).json({
        success: false,
        error: 'oemId and name are required',
      });
    }

    // Verify OEM exists
    const oem = await prisma.oEM.findUnique({ where: { id: oemId } });
    if (!oem) {
      return res.status(404).json({
        success: false,
        error: 'OEM not found',
      });
    }

    // Generate slug
    const slug = slugify(name, { lower: true, strict: true });

    // Create category
    const category = await prisma.equipmentCategory.create({
      data: {
        oemId,
        name,
        slug: `${oem.name.toLowerCase()}-${slug}`,
        description,
      },
    });

    return res.status(201).json({
      success: true,
      category,
    });
  } catch (error: any) {
    console.error('Error creating category:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Category with this name already exists for this OEM',
      });
    }
    next(error);
  }
}

/**
 * Create new equipment sub-category
 */
export async function createSubCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { categoryId, name, description } = req.body;

    if (!categoryId || !name) {
      return res.status(400).json({
        success: false,
        error: 'categoryId and name are required',
      });
    }

    // Verify category exists
    const category = await prisma.equipmentCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    // Generate slug
    const slug = slugify(name, { lower: true, strict: true });

    // Create sub-category
    const subCategory = await prisma.equipmentSubCategory.create({
      data: {
        categoryId,
        name,
        slug: `${category.slug}-${slug}`,
        description,
      },
    });

    return res.status(201).json({
      success: true,
      subCategory,
    });
  } catch (error: any) {
    console.error('Error creating sub-category:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Sub-category with this name already exists for this category',
      });
    }
    next(error);
  }
}

/**
 * Create new product line
 */
export async function createProductLine(req: Request, res: Response, next: NextFunction) {
  try {
    const { subCategoryId, name, description } = req.body;

    if (!subCategoryId || !name) {
      return res.status(400).json({
        success: false,
        error: 'subCategoryId and name are required',
      });
    }

    // Verify sub-category exists and get OEM ID
    const subCategory = await prisma.equipmentSubCategory.findUnique({
      where: { id: subCategoryId },
      include: {
        category: {
          include: {
            oem: true,
          },
        },
      },
    });

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        error: 'Sub-category not found',
      });
    }

    // Create product line
    const productLine = await prisma.productLine.create({
      data: {
        oemId: subCategory.category.oemId,
        subCategoryId,
        name,
        category: subCategory.category.name, // Use category name as required field
        description,
      },
    });

    return res.status(201).json({
      success: true,
      productLine,
    });
  } catch (error: any) {
    console.error('Error creating product line:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Product line with this name already exists for this OEM',
      });
    }
    next(error);
  }
}

/**
 * Create new model
 */
export async function createModel(req: Request, res: Response, next: NextFunction) {
  try {
    const { productLineId, modelNumber, variants } = req.body;

    if (!productLineId || !modelNumber) {
      return res.status(400).json({
        success: false,
        error: 'productLineId and modelNumber are required',
      });
    }

    // Verify product line exists
    const productLine = await prisma.productLine.findUnique({
      where: { id: productLineId },
    });

    if (!productLine) {
      return res.status(404).json({
        success: false,
        error: 'Product line not found',
      });
    }

    // Create model
    const model = await prisma.model.create({
      data: {
        productLineId,
        modelNumber,
        variants: variants || [modelNumber],
        serialNumberPatterns: [],
        yearsActive: [],
      },
    });

    return res.status(201).json({
      success: true,
      model,
    });
  } catch (error: any) {
    console.error('Error creating model:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Model with this number already exists for this product line',
      });
    }
    next(error);
  }
}
