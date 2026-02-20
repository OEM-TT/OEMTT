import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

/**
 * Get all model requests with filtering and sorting
 * GET /api/model-requests
 */
export async function getModelRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, sortBy = 'request_count', order = 'desc', limit = 100 } = req.query;

    const where: any = {};
    if (status && typeof status === 'string') {
      where.status = status;
    }

    const orderByMap: Record<string, any> = {
      request_count: { requestCount: order },
      last_requested: { lastRequestedAt: order },
      created: { createdAt: order },
    };

    const orderBy = orderByMap[sortBy as string] || orderByMap.request_count;

    const requests = await prisma.modelRequest.findMany({
      where,
      orderBy,
      take: parseInt(limit as string),
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: requests,
      total: requests.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update model request status
 * PATCH /api/model-requests/:id
 */
export async function updateModelRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status, priority, notes } = req.body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (status) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.modelRequest.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete model request
 * DELETE /api/model-requests/:id
 */
export async function deleteModelRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    await prisma.modelRequest.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Model request deleted',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get model requests statistics
 * GET /api/model-requests/stats
 */
export async function getModelRequestStats(req: Request, res: Response, next: NextFunction) {
  try {
    const [total, pending, inProgress, completed] = await Promise.all([
      prisma.modelRequest.count(),
      prisma.modelRequest.count({ where: { status: 'pending' } }),
      prisma.modelRequest.count({ where: { status: 'in_progress' } }),
      prisma.modelRequest.count({ where: { status: 'completed' } }),
    ]);

    const topRequests = await prisma.modelRequest.findMany({
      where: { status: 'pending' },
      orderBy: { requestCount: 'desc' },
      take: 10,
      select: {
        id: true,
        oemName: true,
        modelNumber: true,
        requestCount: true,
        lastRequestedAt: true,
      },
    });

    res.json({
      success: true,
      data: {
        total,
        pending,
        inProgress,
        completed,
        topRequests,
      },
    });
  } catch (error) {
    next(error);
  }
}
