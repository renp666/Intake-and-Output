import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { error } from '../lib/response';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        role: string;
        name: string;
        departmentId?: string;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * JWT Authentication middleware
 * Extracts token from Authorization header (Bearer token)
 * Verifies token and attaches user info to request
 */
export function auth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json(error('No authorization header provided', 401));
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json(error('Invalid authorization header format', 401));
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      username: string;
      role: string;
      name: string;
      departmentId?: string;
    };

    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      name: decoded.name,
      departmentId: decoded.departmentId,
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json(error('Token has expired', 401));
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json(error('Invalid token', 401));
    }
    return res.status(401).json(error('Authentication failed', 401));
  }
}

/**
 * Admin-only middleware
 * Must be used after auth middleware
 */
export function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json(error('Authentication required', 401));
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json(error('Admin access required', 403));
  }

  next();
}

/**
 * Nurse and Admin middleware
 * Must be used after auth middleware
 */
export function nurseOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json(error('Authentication required', 401));
  }

  if (req.user.role !== 'nurse' && req.user.role !== 'admin') {
    return res.status(403).json(error('Nurse or admin access required', 403));
  }

  next();
}
