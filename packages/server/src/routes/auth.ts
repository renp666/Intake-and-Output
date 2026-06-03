import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { success, error } from '../lib/response';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../index';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

/**
 * POST /login - Login with username/password
 */
router.post('/login', validate(loginSchema), asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body;

  // Find user
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      department: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  if (!user) {
    return res.status(401).json(error('Invalid username or password', 401));
  }

  if (!user.isActive) {
    return res.status(403).json(error('Account is disabled', 403));
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    return res.status(401).json(error('Invalid username or password', 401));
  }

  // Generate JWT token
  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  const token = jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      departmentId: user.departmentId,
    },
    jwtSecret,
    { expiresIn }
  );

  // Update last login time
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: user.id,
      operationType: 'login',
      targetTable: 'users',
      targetId: user.id,
      detail: `User logged in: ${user.username}`,
      ipAddress: req.ip,
    },
  });

  return res.json(success({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      departmentId: user.departmentId,
      department: user.department,
    },
  }, 'Login successful'));
}));

/**
 * POST /logout - Logout (client-side, just for logging)
 */
router.post('/logout', auth, asyncHandler(async (req: Request, res: Response) => {
  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      operationType: 'logout',
      targetTable: 'users',
      targetId: req.user!.userId,
      detail: `User logged out: ${req.user!.username}`,
    },
  });

  return res.json(success(null, 'Logout successful'));
}));

/**
 * GET /me - Get current user info
 */
router.get('/me', auth, asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      departmentId: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      department: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  if (!user) {
    return res.status(404).json(error('User not found', 404));
  }

  return res.json(success(user));
}));

/**
 * PUT /password - Change password
 */
router.put('/password', auth, validate(changePasswordSchema), asyncHandler(async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
  });

  if (!user) {
    return res.status(404).json(error('User not found', 404));
  }

  // Verify old password
  const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isOldPasswordValid) {
    return res.status(400).json(error('Old password is incorrect', 400));
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const newPasswordHash = await bcrypt.hash(newPassword, salt);

  // Update password
  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { passwordHash: newPasswordHash },
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      operationType: 'password_change',
      targetTable: 'users',
      targetId: req.user!.userId,
      detail: `Password changed for user: ${user.username}`,
    },
  });

  return res.json(success(null, 'Password changed successfully'));
}));

export default router;
