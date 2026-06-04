import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { success, error } from '../lib/response';
import { auth, adminOnly } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../index';

const router = Router();

// Validation schemas
const createPresetItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  type: z.enum(['intake', 'output'], { required_error: 'Type is required' }),
  unit: z.string().default('ml'),
  permission: z.enum(['self', 'nurse_only']).default('self'),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const updatePresetItemSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['intake', 'output']).optional(),
  unit: z.string().optional(),
  permission: z.enum(['self', 'nurse_only']).optional(),
  sortOrder: z.number().int().optional(),
});

/**
 * GET / - List preset items (filter by type, permission)
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const type = req.query.type as string;
  const permission = req.query.permission as string;
  const includeInactive = req.query.includeInactive as string;
  let userRole: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      const jwt = require('jsonwebtoken');
      const token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      userRole = decoded.role;
    } catch {
      // Invalid token, proceed as patient query
    }
  }

  if (!userRole && permission !== 'self') {
    return res.status(401).json(error('Authentication required', 401));
  }

  const where: any = {};

  if (type) {
    where.type = type;
  }

  if (permission) {
    where.permission = permission;
  }

  if (includeInactive !== 'true') {
    where.isActive = true;
  }

  const items = await prisma.presetItem.findMany({
    where,
    orderBy: [
      { sortOrder: 'asc' },
      { name: 'asc' },
    ],
  });

  return res.json(success(items));
}));

/**
 * POST / - Create preset item (admin)
 */
router.post('/', auth, adminOnly, validate(createPresetItemSchema), asyncHandler(async (req: Request, res: Response) => {
  const { name, type, unit, permission, isActive, sortOrder } = req.body;

  // Check if item already exists
  const existing = await prisma.presetItem.findFirst({
    where: {
      name,
      type,
    },
  });

  if (existing) {
    return res.status(400).json(error('Preset item already exists', 400));
  }

  // Get max sort order if not provided
  let finalSortOrder = sortOrder;
  if (finalSortOrder === undefined) {
    const maxItem = await prisma.presetItem.findFirst({
      where: { type },
      orderBy: { sortOrder: 'desc' },
    });
    finalSortOrder = (maxItem?.sortOrder || 0) + 1;
  }

  const item = await prisma.presetItem.create({
    data: {
      name,
      type,
      unit,
      permission,
      isActive: isActive !== false,
      sortOrder: finalSortOrder,
      isSystem: false,
    },
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      operationType: 'create',
      targetTable: 'preset_items',
      targetId: item.id,
      detail: `Created preset item: ${name} (${type})`,
    },
  });

  return res.status(201).json(success(item, 'Preset item created successfully'));
}));

/**
 * PUT /:id - Update preset item (admin)
 */
router.put('/:id', auth, adminOnly, validate(updatePresetItemSchema), asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.presetItem.findUnique({
    where: { id: req.params.id },
  });

  if (!item) {
    return res.status(404).json(error('Preset item not found', 404));
  }

  const { name, type } = req.body;

  // Check for conflicts
  if (name || type) {
    const existing = await prisma.presetItem.findFirst({
      where: {
        name: name || item.name,
        type: type || item.type,
        id: { not: req.params.id },
      },
    });

    if (existing) {
      return res.status(400).json(error('Preset item with this name and type already exists', 400));
    }
  }

  const updatedItem = await prisma.presetItem.update({
    where: { id: req.params.id },
    data: req.body,
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      operationType: 'update',
      targetTable: 'preset_items',
      targetId: item.id,
      detail: `Updated preset item: ${item.name}`,
    },
  });

  return res.json(success(updatedItem, 'Preset item updated successfully'));
}));

/**
 * PUT /:id/toggle - Toggle active status (admin)
 */
router.put('/:id/toggle', auth, adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.presetItem.findUnique({
    where: { id: req.params.id },
  });

  if (!item) {
    return res.status(404).json(error('Preset item not found', 404));
  }

  const updatedItem = await prisma.presetItem.update({
    where: { id: req.params.id },
    data: {
      isActive: !item.isActive,
    },
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      operationType: 'toggle',
      targetTable: 'preset_items',
      targetId: item.id,
      detail: `${updatedItem.isActive ? 'Enabled' : 'Disabled'} preset item: ${item.name}`,
    },
  });

  return res.json(success(updatedItem, `Preset item ${updatedItem.isActive ? 'enabled' : 'disabled'} successfully`));
}));

/**
 * DELETE /:id - Delete preset item (only non-system items)
 */
router.delete('/:id', auth, adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.presetItem.findUnique({
    where: { id: req.params.id },
  });

  if (!item) {
    return res.status(404).json(error('Preset item not found', 404));
  }

  if (item.isSystem) {
    return res.status(400).json(error('Cannot delete system preset item', 400));
  }

  await prisma.presetItem.delete({
    where: { id: req.params.id },
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      operationType: 'delete',
      targetTable: 'preset_items',
      targetId: item.id,
      detail: `Deleted preset item: ${item.name}`,
    },
  });

  return res.json(success(null, 'Preset item deleted successfully'));
}));

export default router;
