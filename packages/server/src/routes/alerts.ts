import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { success, error } from '../lib/response';
import { auth, adminOnly, nurseOrAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../index';

const router = Router();

// Validation schemas
const handleAlertSchema = z.object({
  handleNotes: z.string().optional(),
});

const alertConfigSchema = z.object({
  oliguria_factor: z.number().positive().optional(),
  oliguria_default: z.number().positive().optional(),
  polyuria: z.number().positive().optional(),
  anuria: z.number().positive().optional(),
  imbalance: z.number().positive().optional(),
});

/**
 * GET / - List alerts with pagination
 */
router.get('/', auth, asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const patientId = req.query.patientId as string;
  const alertType = req.query.alertType as string;
  const alertLevel = req.query.alertLevel as string;
  const isRead = req.query.isRead as string;
  const handled = req.query.handled as string;

  const skip = (page - 1) * pageSize;

  const where: any = {};

  if (patientId) {
    where.patientId = patientId;
  }

  if (alertType) {
    where.alertType = alertType;
  }

  if (alertLevel) {
    where.alertLevel = alertLevel;
  }

  if (isRead !== undefined) {
    where.isRead = isRead === 'true';
  }

  if (handled !== undefined) {
    where.handled = handled === 'true';
  }

  // Department filter for nurses
  if (req.user!.role === 'nurse' && req.user!.departmentId) {
    const departmentBeds = await prisma.bed.findMany({
      where: { departmentId: req.user!.departmentId },
      select: { patientId: true },
    });
    const patientIds = departmentBeds
      .filter((b: { patientId: string | null }) => b.patientId)
      .map((b: { patientId: string | null }) => b.patientId!);

    if (patientIds.length > 0) {
      where.patientId = { in: patientIds };
    } else {
      return res.json(success({
        items: [],
        total: 0,
        page,
        pageSize,
      }));
    }
  }

  const [alerts, total] = await Promise.all([
    prisma.alertRecord.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: { id: true, name: true, hospitalNumber: true, bedNumber: true },
        },
        reader: {
          select: { id: true, name: true },
        },
        handler: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.alertRecord.count({ where }),
  ]);

  return res.json(success({
    items: alerts,
    total,
    page,
    pageSize,
  }));
}));

/**
 * GET /config - Get global alert thresholds
 */
router.get('/config', auth, asyncHandler(async (req: Request, res: Response) => {
  const configs = await prisma.systemConfig.findMany({
    where: {
      configKey: {
        startsWith: 'alert.',
      },
    },
  });

  const configMap: { [key: string]: string } = {};
  for (const config of configs) {
    configMap[config.configKey] = config.configValue;
  }

  return res.json(success({
    oliguria_factor: parseFloat(configMap['alert.oliguria_factor'] || '12'),
    oliguria_default: parseFloat(configMap['alert.oliguria_default'] || '400'),
    polyuria: parseFloat(configMap['alert.polyuria'] || '2500'),
    anuria: parseFloat(configMap['alert.anuria'] || '100'),
    imbalance: parseFloat(configMap['alert.imbalance'] || '1000'),
  }));
}));

/**
 * PUT /config - Update global alert thresholds (admin)
 */
router.put('/config', auth, adminOnly, validate(alertConfigSchema), asyncHandler(async (req: Request, res: Response) => {
  const configs = req.body;

  for (const [key, value] of Object.entries(configs)) {
    if (value !== undefined) {
      await prisma.systemConfig.upsert({
        where: { configKey: `alert.${key}` },
        update: {
          configValue: String(value),
          updatedAt: new Date(),
        },
        create: {
          configKey: `alert.${key}`,
          configValue: String(value),
          description: `Alert threshold: ${key}`,
        },
      });
    }
  }

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      operationType: 'update',
      targetTable: 'system_configs',
      detail: `Updated alert thresholds: ${JSON.stringify(configs)}`,
    },
  });

  return res.json(success(null, 'Alert config updated successfully'));
}));

/**
 * GET /:id - Get single alert
 */
router.get('/:id', auth, asyncHandler(async (req: Request, res: Response) => {
  const alert = await prisma.alertRecord.findUnique({
    where: { id: req.params.id },
    include: {
      patient: true,
      reader: {
        select: { id: true, name: true },
      },
      handler: {
        select: { id: true, name: true },
      },
    },
  });

  if (!alert) {
    return res.status(404).json(error('Alert not found', 404));
  }

  return res.json(success(alert));
}));

/**
 * PUT /:id/read - Mark alert as read
 */
router.put('/:id/read', auth, asyncHandler(async (req: Request, res: Response) => {
  const alert = await prisma.alertRecord.findUnique({
    where: { id: req.params.id },
  });

  if (!alert) {
    return res.status(404).json(error('Alert not found', 404));
  }

  if (alert.isRead) {
    return res.json(success(alert, 'Alert is already read'));
  }

  const updatedAlert = await prisma.alertRecord.update({
    where: { id: req.params.id },
    data: {
      isRead: true,
      readBy: req.user!.userId,
      readAt: new Date(),
    },
  });

  return res.json(success(updatedAlert, 'Alert marked as read'));
}));

/**
 * PUT /:id/handle - Handle alert
 */
router.put('/:id/handle', auth, nurseOrAdmin, validate(handleAlertSchema), asyncHandler(async (req: Request, res: Response) => {
  const alert = await prisma.alertRecord.findUnique({
    where: { id: req.params.id },
  });

  if (!alert) {
    return res.status(404).json(error('Alert not found', 404));
  }

  if (alert.handled) {
    return res.status(400).json(error('Alert is already handled', 400));
  }

  const updatedAlert = await prisma.alertRecord.update({
    where: { id: req.params.id },
    data: {
      handled: true,
      handledBy: req.user!.userId,
      handledAt: new Date(),
      handleNotes: req.body.handleNotes,
      // Also mark as read
      isRead: true,
      readBy: req.user!.userId,
      readAt: new Date(),
    },
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      patientId: alert.patientId,
      operationType: 'handle_alert',
      targetTable: 'alert_records',
      targetId: alert.id,
      detail: `Handled alert: ${alert.alertType} for patient ${alert.hospitalNumber}`,
    },
  });

  return res.json(success(updatedAlert, 'Alert handled successfully'));
}));

export default router;
