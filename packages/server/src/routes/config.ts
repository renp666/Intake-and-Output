import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { success, error } from '../lib/response';
import { auth, adminOnly } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../index';

const router = Router();

// Validation schemas
const updateConfigSchema = z.record(z.string(), z.string());

const createShiftSchema = z.object({
  name: z.string().min(1, 'Shift name is required'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be in HH:mm format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'End time must be in HH:mm format'),
  isDefault: z.boolean().optional(),
});

const updateShiftSchema = z.object({
  name: z.string().min(1).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  isDefault: z.boolean().optional(),
});

/**
 * GET / - Get system config
 */
router.get('/', auth, asyncHandler(async (req: Request, res: Response) => {
  const configs = await prisma.systemConfig.findMany();

  const configMap: { [key: string]: string | null } = {};
  for (const config of configs) {
    configMap[config.configKey] = config.configValue;
  }

  return res.json(success(configMap));
}));

/**
 * PUT / - Update system config (admin)
 */
router.put('/', auth, adminOnly, validate(updateConfigSchema), asyncHandler(async (req: Request, res: Response) => {
  const configs = req.body;

  for (const [key, value] of Object.entries(configs)) {
    await prisma.systemConfig.upsert({
      where: { configKey: key },
      update: {
        configValue: String(value),
        updatedAt: new Date(),
      },
      create: {
        configKey: key,
        configValue: String(value),
      },
    });
  }

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      operationType: 'update',
      targetTable: 'system_configs',
      detail: `Updated system configs: ${JSON.stringify(configs)}`,
    },
  });

  return res.json(success(null, 'Config updated successfully'));
}));

/**
 * GET /shifts - Get shift configs
 */
router.get('/shifts', auth, asyncHandler(async (req: Request, res: Response) => {
  const shifts = await prisma.shiftConfig.findMany({
    orderBy: { startTime: 'asc' },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });

  return res.json(success(shifts));
}));

/**
 * POST /shifts - Create shift config (admin)
 */
router.post('/shifts', auth, adminOnly, validate(createShiftSchema), asyncHandler(async (req: Request, res: Response) => {
  const { name, startTime, endTime, isDefault } = req.body;

  // If setting as default, unset other defaults
  if (isDefault) {
    await prisma.shiftConfig.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }

  const shift = await prisma.shiftConfig.create({
    data: {
      name,
      startTime,
      endTime,
      isDefault: isDefault || false,
      createdBy: req.user!.userId,
    },
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      operationType: 'create',
      targetTable: 'shift_configs',
      targetId: shift.id,
      detail: `Created shift: ${name} (${startTime}-${endTime})`,
    },
  });

  return res.status(201).json(success(shift, 'Shift created successfully'));
}));

/**
 * PUT /shifts/:id - Update shift config (admin)
 */
router.put('/shifts/:id', auth, adminOnly, validate(updateShiftSchema), asyncHandler(async (req: Request, res: Response) => {
  const shift = await prisma.shiftConfig.findUnique({
    where: { id: req.params.id },
  });

  if (!shift) {
    return res.status(404).json(error('Shift not found', 404));
  }

  const { isDefault } = req.body;

  // If setting as default, unset other defaults
  if (isDefault) {
    await prisma.shiftConfig.updateMany({
      where: { isDefault: true, id: { not: req.params.id } },
      data: { isDefault: false },
    });
  }

  const updatedShift = await prisma.shiftConfig.update({
    where: { id: req.params.id },
    data: req.body,
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      operationType: 'update',
      targetTable: 'shift_configs',
      targetId: shift.id,
      detail: `Updated shift: ${shift.name}`,
    },
  });

  return res.json(success(updatedShift, 'Shift updated successfully'));
}));

/**
 * DELETE /shifts/:id - Delete shift config (admin)
 */
router.delete('/shifts/:id', auth, adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const shift = await prisma.shiftConfig.findUnique({
    where: { id: req.params.id },
  });

  if (!shift) {
    return res.status(404).json(error('Shift not found', 404));
  }

  await prisma.shiftConfig.delete({
    where: { id: req.params.id },
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      operationType: 'delete',
      targetTable: 'shift_configs',
      targetId: shift.id,
      detail: `Deleted shift: ${shift.name}`,
    },
  });

  return res.json(success(null, 'Shift deleted successfully'));
}));

export default router;
