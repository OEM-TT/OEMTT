import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

// Validation schema for creating a saved unit
const createSavedUnitSchema = z.object({
  modelId: z.string().uuid(),
  nickname: z.string().min(1).max(255),
  serialNumber: z.string().max(255).optional(),
  installDate: z.string().datetime().optional(),
  location: z.string().max(255).optional(),
  notes: z.string().optional(),
});

// Validation schema for updating a saved unit
const updateSavedUnitSchema = z.object({
  nickname: z.string().min(1).max(255).optional(),
  serialNumber: z.string().max(255).optional(),
  installDate: z.string().datetime().optional(),
  location: z.string().max(255).optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/saved-units
 * Get all saved units for current user
 */
export async function getSavedUnits(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated', 'UNAUTHORIZED');
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { supabaseUserId: req.user.id },
    });

    if (!user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    // Get saved units with model details
    const savedUnits = await prisma.savedUnit.findMany({
      where: { userId: user.id },
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
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: savedUnits,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/saved-units/:id
 * Get a single saved unit by ID
 */
export async function getSavedUnitById(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated', 'UNAUTHORIZED');
    }

    const { id } = req.params;

    // Get user
    const user = await prisma.user.findUnique({
      where: { supabaseUserId: req.user.id },
    });

    if (!user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    // Get saved unit
    const savedUnit = await prisma.savedUnit.findFirst({
      where: {
        id: id as string,
        userId: user.id, // Ensure user owns this saved unit
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
      },
    });

    if (!savedUnit) {
      throw new AppError(404, 'Saved unit not found', 'SAVED_UNIT_NOT_FOUND');
    }

    res.json({
      success: true,
      data: savedUnit,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/saved-units
 * Create a new saved unit
 */
export async function createSavedUnit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated', 'UNAUTHORIZED');
    }

    // Validate request body
    const validationResult = createSavedUnitSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        400,
        'Invalid request data',
        'VALIDATION_ERROR',
        validationResult.error.errors
      );
    }

    const data = validationResult.data;

    // Get user
    const user = await prisma.user.findUnique({
      where: { supabaseUserId: req.user.id },
    });

    if (!user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    // Verify model exists
    const model = await prisma.model.findUnique({
      where: { id: data.modelId },
    });

    if (!model) {
      throw new AppError(404, 'Model not found', 'MODEL_NOT_FOUND');
    }

    // Create saved unit
    const savedUnit = await prisma.savedUnit.create({
      data: {
        userId: user.id,
        modelId: data.modelId,
        nickname: data.nickname,
        serialNumber: data.serialNumber,
        installDate: data.installDate ? new Date(data.installDate) : null,
        location: data.location,
        notes: data.notes,
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
      },
    });

    res.status(201).json({
      success: true,
      data: savedUnit,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/saved-units/:id
 * Update a saved unit
 */
export async function updateSavedUnit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated', 'UNAUTHORIZED');
    }

    const { id } = req.params;

    // Validate request body
    const validationResult = updateSavedUnitSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        400,
        'Invalid request data',
        'VALIDATION_ERROR',
        validationResult.error.errors
      );
    }

    const data = validationResult.data;

    // Get user
    const user = await prisma.user.findUnique({
      where: { supabaseUserId: req.user.id },
    });

    if (!user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    // Verify saved unit exists and belongs to user
    const existingSavedUnit = await prisma.savedUnit.findFirst({
      where: {
        id: id as string,
        userId: user.id,
      },
    });

    if (!existingSavedUnit) {
      throw new AppError(404, 'Saved unit not found', 'SAVED_UNIT_NOT_FOUND');
    }

    // Update saved unit
    const updateData: any = {};
    if (data.nickname !== undefined) updateData.nickname = data.nickname;
    if (data.serialNumber !== undefined) updateData.serialNumber = data.serialNumber;
    if (data.installDate !== undefined)
      updateData.installDate = data.installDate ? new Date(data.installDate) : null;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updatedSavedUnit = await prisma.savedUnit.update({
      where: { id: id as string },
      data: updateData,
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
      },
    });

    res.json({
      success: true,
      data: updatedSavedUnit,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/saved-units/:id
 * Delete a saved unit
 */
export async function deleteSavedUnit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated', 'UNAUTHORIZED');
    }

    const { id } = req.params;

    // Get user
    const user = await prisma.user.findUnique({
      where: { supabaseUserId: req.user.id },
    });

    if (!user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    // Verify saved unit exists and belongs to user
    const savedUnit = await prisma.savedUnit.findFirst({
      where: {
        id: id as string,
        userId: user.id,
      },
    });

    if (!savedUnit) {
      throw new AppError(404, 'Saved unit not found', 'SAVED_UNIT_NOT_FOUND');
    }

    // Delete saved unit
    await prisma.savedUnit.delete({
      where: { id: id as string },
    });

    res.json({
      success: true,
      data: {
        message: 'Saved unit deleted successfully',
      },
    });
  } catch (error) {
    next(error);
  }
}
