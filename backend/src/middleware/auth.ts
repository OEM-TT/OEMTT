import { Request, Response, NextFunction } from 'express';
import { supabaseAnon } from '../config/supabase';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'No authorization token provided', 'UNAUTHORIZED');
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    const { data, error } = await supabaseAnon.auth.getUser(token);

    if (error || !data.user) {
      throw new AppError(401, 'Invalid or expired token', 'INVALID_TOKEN');
    }

    // Attach user to request
    req.user = {
      id: data.user.id,
      email: data.user.email!,
    };

    next();
  } catch (error) {
    next(error);
  }
}
