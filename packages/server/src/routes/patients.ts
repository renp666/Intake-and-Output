import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { success, error } from '../lib/response';
import { auth, nurseOrAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../index';

const router = Router();

// Validation schemas
const createPatientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  hospitalNumber: z.string().min(1, 'Hospital number is required'),
  bedNumber: z.string().optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  admissionDate: z.string().optional(),
  attendingDoctor: z.string().optional(),
  chargeNurse: z.string().optional(),
  notes: z.string().optional(),
});

const updatePatientSchema = z.object({
  name: z.string().min(1).optional(),
  bedNumber: z.string().optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  admissionDate: z.string().optional(),
  dischargeDate: z.string().optional(),
  attendingDoctor: z.string().optional(),
  chargeNurse: z.string().optional(),
  status: z.enum(['active', 'discharged']).optional(),
  notes: z.string().optional(),
});

const dischargeSchema = z.object({
  operator_name: z.string().min(1, 'Operator name is required'),
});

/**
 * POST / - Create patient
 */
router.post('/', auth, nurseOrAdmin, validate(createPatientSchema), asyncHandler(async (req: Request, res: Response) => {
  const { hospitalNumber, ...data } = req.body;

  // Check if hospital number already exists
  const existing = await prisma.patient.findUnique({
    where: { hospitalNumber },
  });

  if (existing) {
    return res.status(400).json(error('Hospital number already exists', 400));
  }

  const patient = await prisma.patient.create({
    data: {
      ...data,
      hospitalNumber,
    },
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      patientId: patient.id,
      operationType: 'create',
      targetTable: 'patients',
      targetId: patient.id,
      detail: `Created patient: ${patient.name} (${patient.hospitalNumber})`,
    },
  });

  return res.status(201).json(success(patient, 'Patient created successfully'));
}));

/**
 * GET / - List patients with pagination and filtering
 */
router.get('/', auth, asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const status = req.query.status as string || 'active';
  const search = req.query.search as string;

  const skip = (page - 1) * pageSize;

  // Build filter
  const where: any = {};

  if (status && status !== 'all') {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { hospitalNumber: { contains: search } },
      { bedNumber: { contains: search } },
    ];
  }

  // Nurses can only see patients in their department
  if (req.user!.role === 'nurse' && req.user!.departmentId) {
    const departmentBeds = await prisma.bed.findMany({
      where: { departmentId: req.user!.departmentId },
      select: { bedNumber: true },
    });
    const bedNumbers = departmentBeds.map((b: { bedNumber: string }) => b.bedNumber);

    if (bedNumbers.length > 0) {
      where.bedNumber = { in: bedNumbers };
    } else {
      // No beds in department, return empty
      return res.json(success({
        items: [],
        total: 0,
        page,
        pageSize,
      }));
    }
  }

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.patient.count({ where }),
  ]);

  return res.json(success({
    items: patients,
    total,
    page,
    pageSize,
  }));
}));

/**
 * GET /:id - Get single patient
 */
router.get('/:id', auth, asyncHandler(async (req: Request, res: Response) => {
  const patient = await prisma.patient.findUnique({
    where: { id: req.params.id },
    include: {
      beds: {
        where: { patientId: req.params.id },
        include: { department: true },
      },
    },
  });

  if (!patient) {
    return res.status(404).json(error('Patient not found', 404));
  }

  return res.json(success(patient));
}));

/**
 * PUT /:id - Update patient
 */
router.put('/:id', auth, nurseOrAdmin, validate(updatePatientSchema), asyncHandler(async (req: Request, res: Response) => {
  const patient = await prisma.patient.findUnique({
    where: { id: req.params.id },
  });

  if (!patient) {
    return res.status(404).json(error('Patient not found', 404));
  }

  const updatedPatient = await prisma.patient.update({
    where: { id: req.params.id },
    data: req.body,
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      patientId: patient.id,
      operationType: 'update',
      targetTable: 'patients',
      targetId: patient.id,
      detail: `Updated patient: ${patient.name}`,
    },
  });

  return res.json(success(updatedPatient, 'Patient updated successfully'));
}));

/**
 * POST /:id/discharge - Discharge patient
 */
router.post('/:id/discharge', auth, nurseOrAdmin, validate(dischargeSchema), asyncHandler(async (req: Request, res: Response) => {
  const patient = await prisma.patient.findUnique({
    where: { id: req.params.id },
  });

  if (!patient) {
    return res.status(404).json(error('Patient not found', 404));
  }

  if (patient.status === 'discharged') {
    return res.status(400).json(error('Patient is already discharged', 400));
  }

  const updatedPatient = await prisma.patient.update({
    where: { id: req.params.id },
    data: {
      status: 'discharged',
      dischargeDate: new Date(),
    },
  });

  // Unbind from bed if bound
  await prisma.bed.updateMany({
    where: { patientId: req.params.id },
    data: { patientId: null },
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      patientId: patient.id,
      operationType: 'discharge',
      targetTable: 'patients',
      targetId: patient.id,
      detail: `Patient discharged by ${req.body.operator_name}: ${patient.name}`,
    },
  });

  return res.json(success(updatedPatient, 'Patient discharged successfully'));
}));

/**
 * GET /by-hospital-number/:number - Find by hospital number
 */
router.get('/by-hospital-number/:number', asyncHandler(async (req: Request, res: Response) => {
  const patient = await prisma.patient.findUnique({
    where: { hospitalNumber: req.params.number },
    select: {
      id: true,
      name: true,
      hospitalNumber: true,
      bedNumber: true,
      status: true,
      admissionDate: true,
    },
  });

  if (!patient) {
    return res.status(404).json(error('Patient not found', 404));
  }

  if (patient.status === 'discharged') {
    return res.status(400).json(error('Patient has been discharged', 400));
  }

  return res.json(success(patient));
}));

/**
 * GET /:id/records - Get patient records
 */
router.get('/:id/records', auth, asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const recordType = req.query.recordType as string;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;

  const skip = (page - 1) * pageSize;

  const where: any = {
    patientId: req.params.id,
    isDeleted: false,
  };

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

  const [records, total] = await Promise.all([
    prisma.intakeOutputRecord.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { recordTime: 'desc' },
      include: {
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

export default router;
