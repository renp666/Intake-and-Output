import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { success, error } from '../lib/response';
import { auth, adminOnly } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../index';

const router = Router();

// Validation schemas
const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Department name is required'),
  code: z.string().min(1, 'Department code is required'),
  description: z.string().optional(),
});

const updateDepartmentSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET / - List departments
 */
router.get('/', auth, asyncHandler(async (req: Request, res: Response) => {
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          users: true,
          beds: true,
        },
      },
    },
  });

  return res.json(success(departments));
}));

/**
 * POST / - Create department (admin)
 */
router.post('/', auth, adminOnly, validate(createDepartmentSchema), asyncHandler(async (req: Request, res: Response) => {
  const { name, code, description } = req.body;

  // Check if name or code already exists
  const existing = await prisma.department.findFirst({
    where: {
      OR: [
        { name },
        { code },
      ],
    },
  });

  if (existing) {
    if (existing.name === name) {
      return res.status(400).json(error('Department name already exists', 400));
    }
    if (existing.code === code) {
      return res.status(400).json(error('Department code already exists', 400));
    }
  }

  const department = await prisma.department.create({
    data: {
      name,
      code,
      description,
    },
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      operationType: 'create',
      targetTable: 'departments',
      targetId: department.id,
      detail: `Created department: ${name} (${code})`,
    },
  });

  return res.status(201).json(success(department, 'Department created successfully'));
}));

/**
 * PUT /:id - Update department (admin)
 */
router.put('/:id', auth, adminOnly, validate(updateDepartmentSchema), asyncHandler(async (req: Request, res: Response) => {
  const department = await prisma.department.findUnique({
    where: { id: req.params.id },
  });

  if (!department) {
    return res.status(404).json(error('Department not found', 404));
  }

  const { name, code } = req.body;

  // Check for conflicts
  if (name && name !== department.name) {
    const nameExists = await prisma.department.findFirst({
      where: { name, id: { not: req.params.id } },
    });
    if (nameExists) {
      return res.status(400).json(error('Department name already exists', 400));
    }
  }

  if (code && code !== department.code) {
    const codeExists = await prisma.department.findFirst({
      where: { code, id: { not: req.params.id } },
    });
    if (codeExists) {
      return res.status(400).json(error('Department code already exists', 400));
    }
  }

  const updatedDepartment = await prisma.department.update({
    where: { id: req.params.id },
    data: req.body,
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      operationType: 'update',
      targetTable: 'departments',
      targetId: department.id,
      detail: `Updated department: ${department.name}`,
    },
  });

  return res.json(success(updatedDepartment, 'Department updated successfully'));
}));

/**
 * DELETE /:id - Delete department (admin)
 */
router.delete('/:id', auth, adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const department = await prisma.department.findUnique({
    where: { id: req.params.id },
    include: {
      _count: {
        select: {
          users: true,
          beds: true,
        },
      },
    },
  });

  if (!department) {
    return res.status(404).json(error('Department not found', 404));
  }

  // Check if department has users or beds
  if (department._count.users > 0) {
    return res.status(400).json(error('Cannot delete department with assigned users', 400));
  }

  if (department._count.beds > 0) {
    return res.status(400).json(error('Cannot delete department with assigned beds', 400));
  }

  await prisma.department.delete({
    where: { id: req.params.id },
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      operationType: 'delete',
      targetTable: 'departments',
      targetId: department.id,
      detail: `Deleted department: ${department.name}`,
    },
  });

  return res.json(success(null, 'Department deleted successfully'));
}));

export default router;
