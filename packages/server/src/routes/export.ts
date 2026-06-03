import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { success, error } from '../lib/response';
import { auth, nurseOrAdmin } from '../middleware/auth';
import { asyncHandler } from '../index';

const router = Router();

/**
 * GET /excel - Export Excel (basic implementation, return JSON for now)
 */
router.get('/excel', auth, nurseOrAdmin, asyncHandler(async (req: Request, res: Response) => {
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  const patientId = req.query.patientId as string;
  const departmentId = req.query.departmentId as string;

  if (!startDate || !endDate) {
    return res.status(400).json(error('Start date and end date are required', 400));
  }

  // Build filter
  const where: any = {
    isDeleted: false,
    confirmedAt: {
      not: null,
      gte: new Date(startDate),
      lte: new Date(endDate),
    },
  };

  if (patientId) {
    where.patientId = patientId;
  }

  // Department filter for nurses
  if (req.user!.role === 'nurse' && req.user!.departmentId) {
    const departmentBeds = await prisma.bed.findMany({
      where: { departmentId: req.user!.departmentId },
      select: { bedNumber: true },
    });
    const bedNumbers = departmentBeds.map((b: { bedNumber: string }) => b.bedNumber);
    if (bedNumbers.length > 0) {
      where.bedNumber = { in: bedNumbers };
    }
  }

  const records = await prisma.intakeOutputRecord.findMany({
    where,
    orderBy: { confirmedAt: 'asc' },
    include: {
      patient: {
        select: {
          name: true,
          hospitalNumber: true,
          bedNumber: true,
        },
      },
      confirmer: {
        select: { name: true },
      },
    },
  });

  // Calculate statistics
  const stats = {
    totalIntake: 0,
    totalOutput: 0,
    balance: 0,
  };

  for (const record of records) {
    if (record.recordType === 'intake') {
      stats.totalIntake += record.amount;
    } else {
      stats.totalOutput += record.amount;
    }
  }
  stats.balance = stats.totalIntake - stats.totalOutput;

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      operationType: 'export',
      targetTable: 'intake_output_records',
      detail: `Exported Excel: ${startDate} to ${endDate}`,
    },
  });

  // TODO: Generate actual Excel file using exceljs or similar
  // For now, return JSON data
  return res.json(success({
    records,
    statistics: stats,
    exportTime: new Date().toISOString(),
    filters: {
      startDate,
      endDate,
      patientId,
    },
  }, 'Data exported successfully (JSON format - Excel generation pending)'));
}));

/**
 * GET /pdf - Export PDF (basic implementation, return JSON for now)
 */
router.get('/pdf', auth, nurseOrAdmin, asyncHandler(async (req: Request, res: Response) => {
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  const patientId = req.query.patientId as string;

  if (!startDate || !endDate) {
    return res.status(400).json(error('Start date and end date are required', 400));
  }

  if (!patientId) {
    return res.status(400).json(error('Patient ID is required for PDF export', 400));
  }

  // Get patient info
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
  });

  if (!patient) {
    return res.status(404).json(error('Patient not found', 404));
  }

  // Build filter
  const where: any = {
    patientId,
    isDeleted: false,
    confirmedAt: {
      not: null,
      gte: new Date(startDate),
      lte: new Date(endDate),
    },
  };

  const records = await prisma.intakeOutputRecord.findMany({
    where,
    orderBy: { confirmedAt: 'asc' },
    include: {
      confirmer: {
        select: { name: true },
      },
    },
  });

  // Calculate statistics
  const stats = {
    totalIntake: 0,
    totalOutput: 0,
    balance: 0,
  };

  for (const record of records) {
    if (record.recordType === 'intake') {
      stats.totalIntake += record.amount;
    } else {
      stats.totalOutput += record.amount;
    }
  }
  stats.balance = stats.totalIntake - stats.totalOutput;

  // Log operation
  await prisma.operationLog.create({
    data: {
      userId: req.user!.userId,
      operationType: 'export',
      targetTable: 'intake_output_records',
      patientId,
      detail: `Exported PDF for patient ${patient.name}: ${startDate} to ${endDate}`,
    },
  });

  // TODO: Generate actual PDF using puppeteer or pdfkit
  // For now, return JSON data
  return res.json(success({
    patient: {
      name: patient.name,
      hospitalNumber: patient.hospitalNumber,
      bedNumber: patient.bedNumber,
      admissionDate: patient.admissionDate,
      attendingDoctor: patient.attendingDoctor,
    },
    records,
    statistics: stats,
    exportTime: new Date().toISOString(),
    filters: {
      startDate,
      endDate,
    },
  }, 'Data exported successfully (JSON format - PDF generation pending)'));
}));

export default router;
