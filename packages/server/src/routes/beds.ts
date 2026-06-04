import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { success, error } from '../lib/response';
import { auth, adminOnly, nurseOrAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../index';
import { buildPatientVerifyUrl } from '../lib/patient-url';

const router = Router();

// Validation schemas
const createBedSchema = z.object({
  bedNumber: z.string().min(1, 'Bed number is required'),
  departmentId: z.string().min(1, 'Department ID is required'),
});

const updateBedSchema = z.object({
  bedNumber: z.string().min(1).optional(),
  departmentId: z.string().min(1).optional(),
});

const bindPatientSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
});

/**
 * GET / - List beds (filtered by department for nurses)
 */
router.get('/', auth, asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const departmentId = req.query.departmentId as string;
  const search = req.query.search as string;

  const skip = (page - 1) * pageSize;

  const where: any = {};

  // Filter by department
  if (departmentId) {
    where.departmentId = departmentId;
  } else if (req.user!.role === 'nurse' && req.user!.departmentId) {
    where.departmentId = req.user!.departmentId;
  }

  if (search) {
    where.OR = [
      { bedNumber: { contains: search } },
    ];
  }

  const [beds, total] = await Promise.all([
    prisma.bed.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { bedNumber: 'asc' },
      include: {
        department: true,
        patient: {
          select: {
            id: true,
            name: true,
            hospitalNumber: true,
            status: true,
          },
        },
      },
    }),
    prisma.bed.count({ where }),
  ]);

  return res.json(success({
    items: beds,
    total,
    page,
    pageSize,
  }));
}));

/**
 * GET /:id - Get single bed
 */
router.get('/:id', auth, asyncHandler(async (req: Request, res: Response) => {
  const bed = await prisma.bed.findUnique({
    where: { id: req.params.id },
    include: {
      department: true,
      patient: true,
    },
  });

  if (!bed) {
    return res.status(404).json(error('Bed not found', 404));
  }

  return res.json(success(bed));
}));

/**
 * POST / - Create bed (admin only)
 */
router.post('/', auth, adminOnly, validate(createBedSchema), asyncHandler(async (req: Request, res: Response) => {
  const { bedNumber, departmentId } = req.body;

  // Check if bed number already exists
  const existing = await prisma.bed.findUnique({
    where: { bedNumber },
  });

  if (existing) {
    return res.status(400).json(error('Bed number already exists', 400));
  }

  // Check if department exists
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
  });

  if (!department) {
    return res.status(400).json(error('Department not found', 400));
  }

  const bed = await prisma.bed.create({
    data: {
      bedNumber,
      departmentId,
    },
    include: {
      department: true,
    },
  });

  return res.status(201).json(success(bed, 'Bed created successfully'));
}));

/**
 * PUT /:id - Update bed (admin only)
 */
router.put('/:id', auth, adminOnly, validate(updateBedSchema), asyncHandler(async (req: Request, res: Response) => {
  const bed = await prisma.bed.findUnique({
    where: { id: req.params.id },
  });

  if (!bed) {
    return res.status(404).json(error('Bed not found', 404));
  }

  const { bedNumber } = req.body;

  // Check if new bed number already exists
  if (bedNumber && bedNumber !== bed.bedNumber) {
    const existing = await prisma.bed.findUnique({
      where: { bedNumber },
    });

    if (existing) {
      return res.status(400).json(error('Bed number already exists', 400));
    }
  }

  const updatedBed = await prisma.bed.update({
    where: { id: req.params.id },
    data: req.body,
    include: {
      department: true,
    },
  });

  // Update patient bed number if changed
  if (bedNumber && bedNumber !== bed.bedNumber && bed.patientId) {
    await prisma.patient.update({
      where: { id: bed.patientId },
      data: { bedNumber },
    });
  }

  return res.json(success(updatedBed, 'Bed updated successfully'));
}));

/**
 * POST /:id/bind - Bind patient to bed
 */
router.post('/:id/bind', auth, nurseOrAdmin, validate(bindPatientSchema), asyncHandler(async (req: Request, res: Response) => {
  const bed = await prisma.bed.findUnique({
    where: { id: req.params.id },
  });

  if (!bed) {
    return res.status(404).json(error('Bed not found', 404));
  }

  if (bed.patientId) {
    return res.status(400).json(error('Bed already has a patient bound', 400));
  }

  const patient = await prisma.patient.findUnique({
    where: { id: req.body.patientId },
  });

  if (!patient) {
    return res.status(404).json(error('Patient not found', 404));
  }

  // Check if patient is already bound to another bed
  const existingBed = await prisma.bed.findFirst({
    where: { patientId: req.body.patientId },
  });

  if (existingBed) {
    return res.status(400).json(error('Patient is already bound to another bed', 400));
  }

  const updatedBed = await prisma.bed.update({
    where: { id: req.params.id },
    data: { patientId: req.body.patientId },
    include: {
      department: true,
      patient: true,
    },
  });

  // Update patient bed number
  await prisma.patient.update({
    where: { id: req.body.patientId },
    data: { bedNumber: bed.bedNumber },
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      patientId: req.body.patientId,
      operationType: 'bind',
      targetTable: 'beds',
      targetId: bed.id,
      detail: `Bound patient ${patient.name} to bed ${bed.bedNumber}`,
    },
  });

  return res.json(success(updatedBed, 'Patient bound to bed successfully'));
}));

/**
 * POST /:id/unbind - Unbind patient from bed
 */
router.post('/:id/unbind', auth, nurseOrAdmin, asyncHandler(async (req: Request, res: Response) => {
  const bed = await prisma.bed.findUnique({
    where: { id: req.params.id },
    include: { patient: true },
  });

  if (!bed) {
    return res.status(404).json(error('Bed not found', 404));
  }

  if (!bed.patientId) {
    return res.status(400).json(error('Bed has no patient bound', 400));
  }

  const patientId = bed.patientId;
  const patientName = bed.patient?.name;

  const updatedBed = await prisma.bed.update({
    where: { id: req.params.id },
    data: { patientId: null },
    include: {
      department: true,
    },
  });

  // Update patient bed number
  await prisma.patient.update({
    where: { id: patientId },
    data: { bedNumber: null },
  });

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      patientId,
      operationType: 'unbind',
      targetTable: 'beds',
      targetId: bed.id,
      detail: `Unbound patient ${patientName} from bed ${bed.bedNumber}`,
    },
  });

  return res.json(success(updatedBed, 'Patient unbound from bed successfully'));
}));

/**
 * GET /:id/qrcode - Generate QR code for bed
 */
router.get('/:id/qrcode', asyncHandler(async (req: Request, res: Response) => {
  const bed = await prisma.bed.findUnique({
    where: { id: req.params.id },
  });

  if (!bed) {
    return res.status(404).json(error('Bed not found', 404));
  }

  // #region debug-point qrcode-headers
  console.log('[DEBUG qrcode] X-Forwarded-Host:', req.get('X-Forwarded-Host'));
  console.log('[DEBUG qrcode] X-Forwarded-Proto:', req.get('X-Forwarded-Proto'));
  console.log('[DEBUG qrcode] Host:', req.get('host'));
  console.log('[DEBUG qrcode] hostname:', req.hostname);
  console.log('[DEBUG qrcode] protocol:', req.protocol);
  // #endregion

  const qrUrl = buildPatientVerifyUrl(bed.bedNumber, req);

  // Update bed with QR code URL
  await prisma.bed.update({
    where: { id: req.params.id },
    data: { qrcode: qrUrl },
  });

  return res.json(success({
    qrCode: qrUrl,
  }));
}));

export default router;
