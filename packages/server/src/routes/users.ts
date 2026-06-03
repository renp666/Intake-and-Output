import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { success, error } from '../lib/response';
import { auth, adminOnly } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../index';

const router = Router();

// Validation schemas
const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['nurse', 'admin']).default('nurse'),
  departmentId: z.string().optional(),
});

const updateUserSchema = z.object({
  username: z.string().min(3).optional(),
  name: z.string().min(1).optional(),
  role: z.enum(['nurse', 'admin']).optional(),
  departmentId: z.string().optional(),
  isActive: z.boolean().optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

/**
 * GET / - List users (filter by department)
 */
router.get('/', auth, adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const departmentId = req.query.departmentId as string;
  const role = req.query.role as string;
  const search = req.query.search as string;

  const skip = (page - 1) * pageSize;

  const where: any = {};

  if (departmentId) {
    where.departmentId = departmentId;
  }

  if (role) {
    where.role = role;
  }

  if (search) {
    where.OR = [
      { username: { contains: search } },
      { name: { contains: search } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        departmentId: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return res.json(success({
    items: users,
    total,
    page,
    pageSize,
  }));
}));

/**
 * POST / - Create user (admin)
 */
router.post('/', auth, adminOnly, validate(createUserSchema), asyncHandler(async (req: Request, res: Response) => {
  const { username, password, name, role, departmentId } = req.body;

  // Check if username already exists
  const existing = await prisma.user.findUnique({
    where: { username },
  });

  if (existing) {
    return res.status(400).json(error('Username already exists', 400));
  }

  // Check if department exists (if provided)
  if (departmentId) {
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      return res.status(400).json(error('Department not found', 400));
    }
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      name,
      role,
      departmentId,
    },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      departmentId: true,
      isActive: true,
      createdAt: true,
      department: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      operationType: 'create',
      targetTable: 'users',
      targetId: user.id,
      detail: `Created user: ${username} (${role})`,
    },
  });

  return res.status(201).json(success(user, 'User created successfully'));
}));

/**
 * PUT /:id - Update user (admin)
 */
router.put('/:id', auth, adminOnly, validate(updateUserSchema), asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
  });

  if (!user) {
    return res.status(404).json(error('User not found', 404));
  }

  const { username } = req.body;

  // Check if username already exists
  if (username && username !== user.username) {
    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      return res.status(400).json(error('Username already exists', 400));
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.params.id },
    data: req.body,
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      departmentId: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      department: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      operationType: 'update',
      targetTable: 'users',
      targetId: user.id,
      detail: `Updated user: ${user.username}`,
    },
  });

  return res.json(success(updatedUser, 'User updated successfully'));
}));

/**
 * DELETE /:id - Delete user (admin)
 */
router.delete('/:id', auth, adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
  });

  if (!user) {
    return res.status(404).json(error('User not found', 404));
  }

  // Prevent deleting self
  if (user.id === req.user!.userId) {
    return res.status(400).json(error('Cannot delete yourself', 400));
  }

  // Check if user has records
  const recordCount = await prisma.intakeOutputRecord.count({
    where: { recordedBy: user.id },
  });

  if (recordCount > 0) {
    // Deactivate instead of delete
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    return res.json(success(null, 'User deactivated successfully (has existing records)'));
  }

  await prisma.user.delete({
    where: { id: req.params.id },
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      operationType: 'delete',
      targetTable: 'users',
      targetId: user.id,
      detail: `Deleted user: ${user.username}`,
    },
  });

  return res.json(success(null, 'User deleted successfully'));
}));

/**
 * POST /:id/reset-password - Reset password (admin)
 */
router.post('/:id/reset-password', auth, adminOnly, validate(resetPasswordSchema), asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
  });

  if (!user) {
    return res.status(404).json(error('User not found', 404));
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(req.body.newPassword, salt);

  await prisma.user.update({
    where: { id: req.params.id },
    data: { passwordHash },
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      operationType: 'reset_password',
      targetTable: 'users',
      targetId: user.id,
      detail: `Reset password for user: ${user.username}`,
    },
  });

  return res.json(success(null, 'Password reset successfully'));
}));

export default router;
