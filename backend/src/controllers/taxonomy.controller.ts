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

/**
 * Create new OEM
 */
export async function createOEM(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, website } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
      });
    }

    // Check if OEM already exists
    const existing = await prisma.oEM.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An OEM with this name already exists',
      });
    }

    // Create OEM (defaults to HVAC vertical)
    const oem = await prisma.oEM.create({
      data: {
        name,
        vertical: 'HVAC',
        ...(website && { website }),
      },
    });

    return res.status(201).json({
      success: true,
      oem,
    });
  } catch (error) {
    console.error('Error creating OEM:', error);
    next(error);
  }
}

/**
 * Update OEM details
 */
export async function updateOEM(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, website } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
      });
    }

    // Check if another OEM with this name exists (excluding current OEM)
    const existing = await prisma.oEM.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        NOT: { id: id as string },
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An OEM with this name already exists',
      });
    }

    const updatedOEM = await prisma.oEM.update({
      where: { id: id as string },
      data: {
        name,
        ...(website !== undefined && { website }),
      },
    });

    return res.json({
      success: true,
      oem: updatedOEM,
      message: 'OEM updated successfully',
    });
  } catch (error) {
    console.error('Error updating OEM:', error);
    next(error);
  }
}

/**
 * Update category details
 */
export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
      });
    }

    const updatedCategory = await prisma.equipmentCategory.update({
      where: { id: id as string },
      data: {
        name,
        ...(description !== undefined && { description }),
      },
    });

    return res.json({
      success: true,
      category: updatedCategory,
      message: 'Category updated successfully',
    });
  } catch (error) {
    console.error('Error updating category:', error);
    next(error);
  }
}

/**
 * Update sub-category details
 */
export async function updateSubCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
      });
    }

    const updatedSubCategory = await prisma.equipmentSubCategory.update({
      where: { id: id as string },
      data: {
        name,
        ...(description !== undefined && { description }),
      },
    });

    return res.json({
      success: true,
      subCategory: updatedSubCategory,
      message: 'Sub-category updated successfully',
    });
  } catch (error) {
    console.error('Error updating sub-category:', error);
    next(error);
  }
}

/**
 * Update product line details
 */
export async function updateProductLine(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
      });
    }

    const updatedProductLine = await prisma.productLine.update({
      where: { id: id as string },
      data: {
        name,
        ...(description !== undefined && { description }),
      },
    });

    return res.json({
      success: true,
      productLine: updatedProductLine,
      message: 'Product line updated successfully',
    });
  } catch (error) {
    console.error('Error updating product line:', error);
    next(error);
  }
}

/**
 * Update model details
 */
export async function updateModel(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { modelNumber } = req.body;

    if (!modelNumber) {
      return res.status(400).json({
        success: false,
        error: 'Model number is required',
      });
    }

    const updatedModel = await prisma.model.update({
      where: { id: id as string },
      data: {
        modelNumber,
      },
    });

    return res.json({
      success: true,
      model: updatedModel,
      message: 'Model updated successfully',
    });
  } catch (error) {
    console.error('Error updating model:', error);
    next(error);
  }
}

/**
 * Move model to different product line
 */
export async function moveModel(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { productLineId } = req.body;

    if (!productLineId) {
      return res.status(400).json({
        success: false,
        error: 'productLineId is required',
      });
    }

    // Verify model exists
    const model = await prisma.model.findUnique({
      where: { id: id as string },
    });

    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'Model not found',
      });
    }

    // Verify target product line exists
    const productLine = await prisma.productLine.findUnique({
      where: { id: productLineId },
    });

    if (!productLine) {
      return res.status(404).json({
        success: false,
        error: 'Target product line not found',
      });
    }

    // Move model
    const updatedModel = await prisma.model.update({
      where: { id: id as string },
      data: { productLineId },
    });

    return res.json({
      success: true,
      model: updatedModel,
      message: 'Model moved successfully',
    });
  } catch (error) {
    console.error('Error moving model:', error);
    next(error);
  }
}

/**
 * Move product line to different sub-category
 */
export async function moveProductLine(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { subCategoryId } = req.body;

    if (!subCategoryId) {
      return res.status(400).json({
        success: false,
        error: 'subCategoryId is required',
      });
    }

    // Verify product line exists
    const productLine = await prisma.productLine.findUnique({
      where: { id: id as string },
    });

    if (!productLine) {
      return res.status(404).json({
        success: false,
        error: 'Product line not found',
      });
    }

    // Verify target sub-category exists and get category info
    const subCategory = await prisma.equipmentSubCategory.findUnique({
      where: { id: subCategoryId },
      include: { category: true },
    });

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        error: 'Target sub-category not found',
      });
    }

    // Move product line
    const updatedProductLine = await prisma.productLine.update({
      where: { id: id as string },
      data: {
        subCategoryId,
        category: subCategory.category.name, // Update category field
      },
    });

    return res.json({
      success: true,
      productLine: updatedProductLine,
      message: 'Product line moved successfully',
    });
  } catch (error) {
    console.error('Error moving product line:', error);
    next(error);
  }
}

/**
 * Move sub-category to different category
 */
export async function moveSubCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { categoryId } = req.body;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        error: 'categoryId is required',
      });
    }

    // Verify sub-category exists
    const subCategory = await prisma.equipmentSubCategory.findUnique({
      where: { id: id as string },
    });

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        error: 'Sub-category not found',
      });
    }

    // Verify target category exists
    const category = await prisma.equipmentCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Target category not found',
      });
    }

    // Move sub-category
    const updatedSubCategory = await prisma.equipmentSubCategory.update({
      where: { id: id as string },
      data: { categoryId },
    });

    return res.json({
      success: true,
      subCategory: updatedSubCategory,
      message: 'Sub-category moved successfully',
    });
  } catch (error) {
    console.error('Error moving sub-category:', error);
    next(error);
  }
}

/**
 * Move category to different OEM
 */
export async function moveCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { oemId } = req.body;

    if (!oemId) {
      return res.status(400).json({
        success: false,
        error: 'oemId is required',
      });
    }

    // Verify category exists
    const category = await prisma.equipmentCategory.findUnique({
      where: { id: id as string },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    // Verify target OEM exists
    const oem = await prisma.oEM.findUnique({
      where: { id: oemId },
    });

    if (!oem) {
      return res.status(404).json({
        success: false,
        error: 'Target OEM not found',
      });
    }

    // Move category
    const updatedCategory = await prisma.equipmentCategory.update({
      where: { id: id as string },
      data: { oemId },
    });

    return res.json({
      success: true,
      category: updatedCategory,
      message: 'Category moved successfully',
    });
  } catch (error) {
    console.error('Error moving category:', error);
    next(error);
  }
}
