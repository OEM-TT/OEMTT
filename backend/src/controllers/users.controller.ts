import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

// Validation schema for user update
const updateUserSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    phone: z.string().max(50).optional(),
    onboardingCompleted: z.boolean().optional(),
});

/**
 * GET /api/users/me
 * Get current user profile
 */
export async function getCurrentUser(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        if (!req.user) {
            throw new AppError(401, 'User not authenticated', 'UNAUTHORIZED');
        }

        // Find user by Supabase ID or create if doesn't exist
        let user = await prisma.user.findUnique({
            where: { supabaseUserId: req.user.id },
            select: {
                id: true,
                email: true,
                supabaseUserId: true,
                name: true,
                phone: true,
                role: true,
                subscriptionTier: true,
                subscriptionStatus: true,
                createdAt: true,
                lastActiveAt: true,
                onboardingCompleted: true,
            },
        });

        // Auto-create user if they don't exist (first login)
        if (!user) {
            try {
                user = await prisma.user.create({
                    data: {
                        email: req.user.email,
                        supabaseUserId: req.user.id,
                        role: 'technician',
                        subscriptionTier: 'free',
                        subscriptionStatus: 'active',
                    },
                    select: {
                        id: true,
                        email: true,
                        supabaseUserId: true,
                        name: true,
                        phone: true,
                        role: true,
                        subscriptionTier: true,
                        subscriptionStatus: true,
                        createdAt: true,
                        lastActiveAt: true,
                        onboardingCompleted: true,
                    },
                });
            } catch (error: any) {
                // Handle race condition - user might have been created by another request
                if (error.code === 'P2002') {
                    // Unique constraint violation - user already exists, fetch it
                    user = await prisma.user.findUnique({
                        where: { supabaseUserId: req.user.id },
                        select: {
                            id: true,
                            email: true,
                            supabaseUserId: true,
                            name: true,
                            phone: true,
                            role: true,
                            subscriptionTier: true,
                            subscriptionStatus: true,
                            createdAt: true,
                            lastActiveAt: true,
                            onboardingCompleted: true,
                        },
                    });
                    if (!user) {
                        throw new AppError(500, 'Failed to create or find user', 'USER_CREATION_FAILED');
                    }
                } else {
                    throw error;
                }
            }
        }

        // Update last active timestamp
        await prisma.user.update({
            where: { id: user.id },
            data: { lastActiveAt: new Date() },
        });

        res.json({
            success: true,
            data: user,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PATCH /api/users/me
 * Update current user profile
 */
export async function updateCurrentUser(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        if (!req.user) {
            throw new AppError(401, 'User not authenticated', 'UNAUTHORIZED');
        }

        // Validate request body
        const validationResult = updateUserSchema.safeParse(req.body);
        if (!validationResult.success) {
            throw new AppError(
                400,
                'Invalid request data',
                'VALIDATION_ERROR',
                validationResult.error.errors
            );
        }

        const updateData = validationResult.data;

        // Find user
        const user = await prisma.user.findUnique({
            where: { supabaseUserId: req.user.id },
        });

        if (!user) {
            throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: updateData,
            select: {
                id: true,
                email: true,
                supabaseUserId: true,
                name: true,
                phone: true,
                role: true,
                subscriptionTier: true,
                subscriptionStatus: true,
                createdAt: true,
                lastActiveAt: true,
                onboardingCompleted: true,
            },
        });

        res.json({
            success: true,
            data: updatedUser,
        });
    } catch (error) {
        next(error);
    }
}
