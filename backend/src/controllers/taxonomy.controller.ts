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
                  slug: slugify(line.name, { lower: true, strict: true }),
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

/**
 * Get model details with manuals
 */
export async function getModelDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const model = await prisma.model.findUnique({
      where: { id: id as string },
      include: {
        productLine: {
          include: {
            subCategory: {
              include: {
                category: {
                  include: {
                    oem: true,
                  },
                },
              },
            },
          },
        },
        manuals: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'Model not found',
      });
    }

    return res.json({
      success: true,
      model,
    });
  } catch (error) {
    console.error('Error fetching model details:', error);
    next(error);
  }
}

/**
 * Delete equipment category
 */
export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    // Check if category has sub-categories
    const category = await prisma.equipmentCategory.findUnique({
      where: { id: id as string },
      include: { _count: { select: { subCategories: true } } },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    if (category._count.subCategories > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category with existing sub-categories. Delete them first.',
      });
    }

    await prisma.equipmentCategory.delete({
      where: { id: id as string },
    });

    return res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    next(error);
  }
}

/**
 * Delete equipment sub-category
 */
export async function deleteSubCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    // Check if sub-category has product lines
    const subCategory = await prisma.equipmentSubCategory.findUnique({
      where: { id: id as string },
      include: { _count: { select: { productLines: true } } },
    });

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        error: 'Sub-category not found',
      });
    }

    if (subCategory._count.productLines > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete sub-category with existing product lines. Delete them first.',
      });
    }

    await prisma.equipmentSubCategory.delete({
      where: { id: id as string },
    });

    return res.json({
      success: true,
      message: 'Sub-category deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting sub-category:', error);
    next(error);
  }
}

/**
 * Delete product line
 */
export async function deleteProductLine(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    // Check if product line has models
    const productLine = await prisma.productLine.findUnique({
      where: { id: id as string },
      include: { _count: { select: { models: true } } },
    });

    if (!productLine) {
      return res.status(404).json({
        success: false,
        error: 'Product line not found',
      });
    }

    if (productLine._count.models > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete product line with existing models. Delete them first.',
      });
    }

    await prisma.productLine.delete({
      where: { id: id as string },
    });

    return res.json({
      success: true,
      message: 'Product line deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting product line:', error);
    next(error);
  }
}

/**
 * Delete model
 */
export async function deleteModel(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    // Check if model has manuals
    const model = await prisma.model.findUnique({
      where: { id: id as string },
      include: { _count: { select: { manuals: true } } },
    });

    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'Model not found',
      });
    }

    if (model._count.manuals > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete model with existing manuals. Delete them first.',
      });
    }

    await prisma.model.delete({
      where: { id: id as string },
    });

    return res.json({
      success: true,
      message: 'Model deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting model:', error);
    next(error);
  }
}
