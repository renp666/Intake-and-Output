import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { success, error } from '../lib/response';
import { auth, nurseOrAdmin, adminOnly } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../index';
import { checkPatientAlerts } from '../utils/alert';

const router = Router();

// Validation schemas
const createRecordSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  recordType: z.enum(['intake', 'output'], { required_error: 'Record type is required' }),
  itemName: z.string().min(1, 'Item name is required'),
  amount: z.number().min(0, 'Amount must be positive'),
  unit: z.string().default('ml'),
  description: z.string().optional(),
  recordTime: z.string().optional(),
  inputMethod: z.enum(['manual', 'voice']).default('manual'),
  notes: z.string().optional(),
  deviceFingerprint: z.string().optional(),
});

const updateRecordSchema = z.object({
  recordType: z.enum(['intake', 'output']).optional(),
  itemName: z.string().min(1).optional(),
  amount: z.number().min(0).optional(),
  unit: z.string().optional(),
  description: z.string().optional(),
  recordTime: z.string().optional(),
  notes: z.string().optional(),
  operator_name: z.string().optional(),
});

const operatorSchema = z.object({
  operator_name: z.string().min(1, 'Operator name is required'),
});

/**
 * POST / - Create record (public for patient, auth for nurse)
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  // Check for auth token (optional for patient)
  let userId: string | undefined;
  let userRole: string | undefined;
  let departmentId: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      const jwt = require('jsonwebtoken');
      const token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      userId = decoded.userId;
      userRole = decoded.role;
      departmentId = decoded.departmentId;
    } catch {
      // Invalid token, proceed as patient
    }
  }

  const validatedData = createRecordSchema.parse(req.body);
  const { patientId, recordTime, ...recordData } = validatedData;

  // Check if patient exists
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
  });

  if (!patient) {
    return res.status(404).json(error('Patient not found', 404));
  }

  if (patient.status === 'discharged') {
    return res.status(400).json(error('Patient has been discharged', 400));
  }

  // For patient input, check permission (only non-medical items)
  if (!userId) {
    // Patient can only input non-medical items
    const presetItem = await prisma.presetItem.findFirst({
      where: { name: recordData.itemName, type: recordData.recordType },
    });

    if (presetItem && presetItem.permission === 'nurse_only') {
      return res.status(403).json(error('This item can only be recorded by nurses', 403));
    }
  }

  // Get bed number from patient
  const bed = await prisma.bed.findFirst({
    where: { patientId },
  });

  // Create record
  const record = await prisma.intakeOutputRecord.create({
    data: {
      ...recordData,
      patientId,
      hospitalNumber: patient.hospitalNumber,
      bedNumber: bed?.bedNumber || patient.bedNumber,
      recordTime: recordTime ? new Date(recordTime) : new Date(),
      recordedBy: userId || null,
      inputMethod: validatedData.inputMethod,
      deviceFingerprint: validatedData.deviceFingerprint,
    },
    include: {
      patient: {
        select: { id: true, name: true, hospitalNumber: true },
      },
    },
  });

  // Create change log
  await prisma.recordChangeLog.create({
    data: {
      recordId: record.id,
      fieldName: 'record',
      oldValue: null,
      newValue: JSON.stringify(record),
      changedBy: userId || null,
      changeType: 'create',
    },
  });

  // Check for alerts if nurse is creating
  if (userId && userRole) {
    await checkPatientAlerts(patientId);
  }

  return res.status(201).json(success(record, 'Record created successfully'));
}));

/**
 * GET / - List records with pagination and filtering
 */
router.get('/', auth, asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const patientId = req.query.patientId as string;
  const bedNumber = req.query.bedNumber as string;
  const recordType = req.query.recordType as string;
  const status = req.query.status as string; // pending, confirmed, deleted
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  const search = req.query.search as string;

  const skip = (page - 1) * pageSize;

  const where: any = {};

  // Status filter
  if (status === 'deleted') {
    where.isDeleted = true;
  } else if (status === 'pending') {
    where.isDeleted = false;
    where.confirmedAt = null;
  } else if (status === 'confirmed') {
    where.isDeleted = false;
    where.confirmedAt = { not: null };
  } else {
    where.isDeleted = false;
  }

  if (patientId) {
    where.patientId = patientId;
  }

  if (bedNumber) {
    where.bedNumber = bedNumber;
  }

  if (recordType) {
    where.recordType = recordType;
  }

  if (startDate || endDate) {
    where.recordTime = {};
    if (startDate) {
      where.recordTime.gte = new Date(startDate);
    }
    if (endDate) {
      where.recordTime.lte = new Date(endDate);
    }
  }

  if (search) {
    where.OR = [
      { itemName: { contains: search } },
      { hospitalNumber: { contains: search } },
    ];
  }

  // Nurses can only see records in their department
  if (req.user!.role === 'nurse' && req.user!.departmentId) {
    const departmentBeds = await prisma.bed.findMany({
      where: { departmentId: req.user!.departmentId },
      select: { bedNumber: true },
    });
    const bedNumbers = departmentBeds.map((b: { bedNumber: string }) => b.bedNumber);

    if (bedNumbers.length > 0) {
      where.bedNumber = { in: bedNumbers };
    } else {
      return res.json(success({
        items: [],
        total: 0,
        page,
        pageSize,
      }));
    }
  }

  const [records, total] = await Promise.all([
    prisma.intakeOutputRecord.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { recordTime: 'desc' },
      include: {
        patient: {
          select: { id: true, name: true, hospitalNumber: true, bedNumber: true },
        },
        recorder: {
          select: { id: true, name: true, role: true },
        },
        confirmer: {
          select: { id: true, name: true, role: true },
        },
      },
    }),
    prisma.intakeOutputRecord.count({ where }),
  ]);

  return res.json(success({
    items: records,
    total,
    page,
    pageSize,
  }));
}));

/**
 * GET /:id - Get single record
 */
router.get('/:id', auth, asyncHandler(async (req: Request, res: Response) => {
  const record = await prisma.intakeOutputRecord.findUnique({
    where: { id: req.params.id },
    include: {
      patient: true,
      recorder: {
        select: { id: true, name: true, role: true },
      },
      confirmer: {
        select: { id: true, name: true, role: true },
      },
      deleter: {
        select: { id: true, name: true, role: true },
      },
    },
  });

  if (!record) {
    return res.status(404).json(error('Record not found', 404));
  }

  return res.json(success(record));
}));

/**
 * PUT /:id - Update record
 */
router.put('/:id', validate(updateRecordSchema), asyncHandler(async (req: Request, res: Response) => {
  // Check for auth token (optional for patient)
  let userId: string | undefined;
  let userRole: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      const jwt = require('jsonwebtoken');
      const token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      userId = decoded.userId;
      userRole = decoded.role;
    } catch {
      // Invalid token, proceed as patient
    }
  }

  const record = await prisma.intakeOutputRecord.findUnique({
    where: { id: req.params.id },
  });

  if (!record) {
    return res.status(404).json(error('Record not found', 404));
  }

  if (record.isDeleted) {
    return res.status(400).json(error('Cannot update deleted record', 400));
  }

  // Check permissions
  if (!userId) {
    // Patient can only update their own pending records
    if (record.confirmedAt) {
      return res.status(403).json(error('Cannot update confirmed record', 403));
    }
    // TODO: Verify patient identity via device fingerprint
  } else if (userRole === 'nurse') {
    // Nurse needs operator_name
    if (!req.body.operator_name) {
      return res.status(400).json(error('Operator name is required for nurses', 400));
    }
  }

  const { operator_name, ...updateData } = req.body;

  // Track changes
  const changes: any[] = [];
  for (const [key, value] of Object.entries(updateData)) {
    if (record[key as keyof typeof record] !== value) {
      changes.push({
        recordId: record.id,
        fieldName: key,
        oldValue: String(record[key as keyof typeof record]),
        newValue: String(value),
        changedBy: userId || null,
        changeType: 'update',
      });
    }
  }

  // Update record
  const updatedRecord = await prisma.intakeOutputRecord.update({
    where: { id: req.params.id },
    data: {
      ...updateData,
      recordTime: updateData.recordTime ? new Date(updateData.recordTime) : undefined,
    },
  });

  // Save change logs
  if (changes.length > 0) {
    await prisma.recordChangeLog.createMany({
      data: changes,
    });
  }

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: userId || null,
      patientId: record.patientId,
      operationType: 'update',
      targetTable: 'intake_output_records',
      targetId: record.id,
      detail: `Updated record: ${record.itemName} by ${operator_name || 'patient'}`,
    },
  });

  return res.json(success(updatedRecord, 'Record updated successfully'));
}));

/**
 * DELETE /:id - Soft delete record
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  // Check for auth token (optional for patient)
  let userId: string | undefined;
  let userRole: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      const jwt = require('jsonwebtoken');
      const token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      userId = decoded.userId;
      userRole = decoded.role;
    } catch {
      // Invalid token, proceed as patient
    }
  }

  const record = await prisma.intakeOutputRecord.findUnique({
    where: { id: req.params.id },
  });

  if (!record) {
    return res.status(404).json(error('Record not found', 404));
  }

  if (record.isDeleted) {
    return res.status(400).json(error('Record is already deleted', 400));
  }

  // Check permissions
  if (!userId) {
    // Patient can only delete their own pending records
    if (record.confirmedAt) {
      return res.status(403).json(error('Cannot delete confirmed record', 403));
    }
  } else if (userRole === 'nurse') {
    // Nurse needs operator_name from body or query
    const operatorName = req.body?.operator_name || req.query.operator_name;
    if (!operatorName) {
      return res.status(400).json(error('Operator name is required for nurses', 400));
    }
  }

  // Soft delete
  await prisma.intakeOutputRecord.update({
    where: { id: req.params.id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: userId || null,
    },
  });

  // Create change log
  await prisma.recordChangeLog.create({
    data: {
      recordId: record.id,
      fieldName: 'isDeleted',
      oldValue: 'false',
      newValue: 'true',
      changedBy: userId || null,
      changeType: 'delete',
    },
  });

  // Log operation
  const operatorName = req.body?.operator_name || req.query.operator_name || 'patient';
  await prisma.operationLog.create({
    data: {
      userId: userId || null,
      patientId: record.patientId,
      operationType: 'delete',
      targetTable: 'intake_output_records',
      targetId: record.id,
      detail: `Deleted record: ${record.itemName} by ${operatorName}`,
    },
  });

  return res.json(success(null, 'Record deleted successfully'));
}));

/**
 * POST /:id/restore - Restore deleted record
 */
router.post('/:id/restore', validate(operatorSchema), asyncHandler(async (req: Request, res: Response) => {
  const record = await prisma.intakeOutputRecord.findUnique({
    where: { id: req.params.id },
  });

  if (!record) {
    return res.status(404).json(error('Record not found', 404));
  }

  if (!record.isDeleted) {
    return res.status(400).json(error('Record is not deleted', 400));
  }

  // Restore record
  const restoredRecord = await prisma.intakeOutputRecord.update({
    where: { id: req.params.id },
    data: {
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    },
  });

  // Create change log
  await prisma.recordChangeLog.create({
    data: {
      recordId: record.id,
      fieldName: 'isDeleted',
      oldValue: 'true',
      newValue: 'false',
      changedBy: req.user!.userId,
      changeType: 'restore',
    },
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      patientId: record.patientId,
      operationType: 'restore',
      targetTable: 'intake_output_records',
      targetId: record.id,
      detail: `Restored record: ${record.itemName} by ${req.body.operator_name}`,
    },
  });

  return res.json(success(restoredRecord, 'Record restored successfully'));
}));

/**
 * POST /:id/confirm - Nurse confirms record
 */
router.post('/:id/confirm', auth, nurseOrAdmin, validate(operatorSchema), asyncHandler(async (req: Request, res: Response) => {
  const record = await prisma.intakeOutputRecord.findUnique({
    where: { id: req.params.id },
  });

  if (!record) {
    return res.status(404).json(error('Record not found', 404));
  }

  if (record.isDeleted) {
    return res.status(400).json(error('Cannot confirm deleted record', 400));
  }

  if (record.confirmedAt) {
    return res.status(400).json(error('Record is already confirmed', 400));
  }

  // Confirm record
  const confirmedRecord = await prisma.intakeOutputRecord.update({
    where: { id: req.params.id },
    data: {
      confirmedAt: new Date(),
      confirmedBy: req.user!.userId,
    },
  });

  // Create change log
  await prisma.recordChangeLog.create({
    data: {
      recordId: record.id,
      fieldName: 'confirmedAt',
      oldValue: null,
      newValue: new Date().toISOString(),
      changedBy: req.user!.userId,
      changeType: 'update',
    },
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      patientId: record.patientId,
      operationType: 'confirm',
      targetTable: 'intake_output_records',
      targetId: record.id,
      detail: `Confirmed record: ${record.itemName} by ${req.body.operator_name}`,
    },
  });

  // Check for alerts
  await checkPatientAlerts(record.patientId);

  return res.json(success(confirmedRecord, 'Record confirmed successfully'));
}));

/**
 * POST /:id/unconfirm - Admin unconfirms record
 */
router.post('/:id/unconfirm', auth, adminOnly, validate(operatorSchema), asyncHandler(async (req: Request, res: Response) => {
  const record = await prisma.intakeOutputRecord.findUnique({
    where: { id: req.params.id },
  });

  if (!record) {
    return res.status(404).json(error('Record not found', 404));
  }

  if (record.isDeleted) {
    return res.status(400).json(error('Cannot unconfirm deleted record', 400));
  }

  if (!record.confirmedAt) {
    return res.status(400).json(error('Record is not confirmed', 400));
  }

  // Unconfirm record
  const unconfirmedRecord = await prisma.intakeOutputRecord.update({
    where: { id: req.params.id },
    data: {
      confirmedAt: null,
      confirmedBy: null,
    },
  });

  // Create change log
  await prisma.recordChangeLog.create({
    data: {
      recordId: record.id,
      fieldName: 'confirmedAt',
      oldValue: record.confirmedAt?.toISOString(),
      newValue: null,
      changedBy: req.user!.userId,
      changeType: 'update',
    },
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      patientId: record.patientId,
      operationType: 'unconfirm',
      targetTable: 'intake_output_records',
      targetId: record.id,
      detail: `Unconfirmed record: ${record.itemName} by ${req.body.operator_name}`,
    },
  });

  return res.json(success(unconfirmedRecord, 'Record unconfirmed successfully'));
}));

/**
 * GET /:id/history - Get record change history
 */
router.get('/:id/history', auth, asyncHandler(async (req: Request, res: Response) => {
  const record = await prisma.intakeOutputRecord.findUnique({
    where: { id: req.params.id },
  });

  if (!record) {
    return res.status(404).json(error('Record not found', 404));
  }

  const history = await prisma.recordChangeLog.findMany({
    where: { recordId: req.params.id },
    orderBy: { changedAt: 'desc' },
    include: {
      user: {
        select: { id: true, name: true, role: true },
      },
    },
  });

  return res.json(success(history));
}));

export default router;
