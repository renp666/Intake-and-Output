import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { success } from '../lib/response';
import { auth, adminOnly } from '../middleware/auth';
import { asyncHandler } from '../index';

const router = Router();

/**
 * GET / - List operation logs with pagination and filtering
 */
router.get('/', auth, adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const userId = req.query.userId as string;
  const operationType = req.query.operationType as string;
  const targetTable = req.query.targetTable as string;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  const search = req.query.search as string;

  const skip = (page - 1) * pageSize;

  const where: any = {};

  if (userId) {
    where.userId = userId;
  }

  if (operationType) {
    where.operationType = operationType;
  }

  if (targetTable) {
    where.targetTable = targetTable;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  if (search) {
    where.detail = { contains: search };
  }

  const [logs, total] = await Promise.all([
    prisma.operationLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, username: true, name: true, role: true },
        },
        patient: {
          select: { id: true, name: true, hospitalNumber: true },
        },
      },
    }),
    prisma.operationLog.count({ where }),
  ]);

  return res.json(success({
    items: logs,
    total,
    page,
    pageSize,
  }));
}));

export default router;
