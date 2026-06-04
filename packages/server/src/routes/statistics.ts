import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { success, error } from '../lib/response';
import { auth } from '../middleware/auth';
import { asyncHandler } from '../index';

const router = Router();

interface RecordStats {
  intake: number;
  output: number;
  balance: number;
  items: {
    [key: string]: {
      intake: number;
      output: number;
      intakeCount?: number;
      outputCount?: number;
    };
  };
}

/**
 * GET /daily - 24-hour statistics
 * Query params: patientId, bedNumber, type (rolling/cumulative)
 */
router.get('/daily', asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.query.patientId as string;
  const bedNumber = req.query.bedNumber as string;
  const type = req.query.type as string || 'rolling'; // rolling or cumulative

  let userRole: string | undefined;
  let departmentId: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      const jwt = require('jsonwebtoken');
      const token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      userRole = decoded.role;
      departmentId = decoded.departmentId;
    } catch {
      // Invalid token, proceed as patient query
    }
  }

  if (!patientId && !bedNumber) {
    return res.status(400).json(error('Patient ID or bed number is required', 400));
  }

  if (!userRole && !patientId) {
    return res.status(401).json(error('Authentication required', 401));
  }

  // Build filter
  const where: any = {
    isDeleted: false,
    confirmedAt: { not: null },
  };

  if (patientId) {
    where.patientId = patientId;
  } else if (bedNumber) {
    where.bedNumber = bedNumber;
  }

  // Department filter for nurses
  if (userRole === 'nurse' && departmentId) {
    const departmentBeds = await prisma.bed.findMany({
      where: { departmentId },
      select: { bedNumber: true },
    });
    const bedNumbers = departmentBeds.map((b: { bedNumber: string }) => b.bedNumber);
    if (bedNumbers.length > 0) {
      where.bedNumber = { in: bedNumbers };
    }
  }

  const now = new Date();
  let startTime: Date;

  if (type === 'cumulative') {
    // From today 00:00 to now
    startTime = new Date(now);
    startTime.setHours(0, 0, 0, 0);
  } else {
    // Rolling 24 hours
    startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  where.confirmedAt = {
    gte: startTime,
    lte: now,
  };

  const records = await prisma.intakeOutputRecord.findMany({
    where,
    select: {
      recordType: true,
      itemName: true,
      amount: true,
      confirmedAt: true,
    },
  });

  // Calculate statistics
  const stats: RecordStats = {
    intake: 0,
    output: 0,
    balance: 0,
    items: {},
  };

  for (const record of records) {
    if (record.recordType === 'intake') {
      stats.intake += record.amount;
    } else {
      stats.output += record.amount;
    }

    // Track by item
    if (!stats.items[record.itemName]) {
      stats.items[record.itemName] = { intake: 0, output: 0, intakeCount: 0, outputCount: 0 };
    }
    if (record.recordType === 'intake') {
      stats.items[record.itemName].intake += record.amount;
      stats.items[record.itemName].intakeCount += 1;
    } else {
      stats.items[record.itemName].output += record.amount;
      stats.items[record.itemName].outputCount += 1;
    }
  }

  stats.balance = stats.intake - stats.output;

  return res.json(success({
    type,
    startTime,
    endTime: now,
    stats,
    recordCount: records.length,
  }));
}));

/**
 * GET /custom - Custom time range statistics
 * Query params: startDate, endDate, patientId, bedNumber, shiftId
 */
router.get('/custom', auth, asyncHandler(async (req: Request, res: Response) => {
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  const patientId = req.query.patientId as string;
  const bedNumber = req.query.bedNumber as string;
  const shiftId = req.query.shiftId as string;

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

  if (bedNumber) {
    where.bedNumber = bedNumber;
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
    select: {
      recordType: true,
      itemName: true,
      amount: true,
      confirmedAt: true,
      patientId: true,
      hospitalNumber: true,
    },
  });

  // Calculate statistics
  const stats: RecordStats = {
    intake: 0,
    output: 0,
    balance: 0,
    items: {},
  };

  for (const record of records) {
    if (record.recordType === 'intake') {
      stats.intake += record.amount;
    } else {
      stats.output += record.amount;
    }

    if (!stats.items[record.itemName]) {
      stats.items[record.itemName] = { intake: 0, output: 0 };
    }
    if (record.recordType === 'intake') {
      stats.items[record.itemName].intake += record.amount;
    } else {
      stats.items[record.itemName].output += record.amount;
    }
  }

  stats.balance = stats.intake - stats.output;

  return res.json(success({
    startDate,
    endDate,
    stats,
    recordCount: records.length,
  }));
}));

/**
 * GET /patient/:id - Patient statistics
 */
router.get('/patient/:id', auth, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const days = parseInt(req.query.days as string) || 1;

  const patient = await prisma.patient.findUnique({
    where: { id },
  });

  if (!patient) {
    return res.status(404).json(error('Patient not found', 404));
  }

  const now = new Date();
  const startTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const records = await prisma.intakeOutputRecord.findMany({
    where: {
      patientId: id,
      isDeleted: false,
      confirmedAt: {
        not: null,
        gte: startTime,
        lte: now,
      },
    },
    select: {
      recordType: true,
      itemName: true,
      amount: true,
      confirmedAt: true,
      recordTime: true,
    },
    orderBy: { confirmedAt: 'asc' },
  });

  // Calculate daily statistics
  const dailyStats: { [date: string]: RecordStats } = {};

  for (const record of records) {
    const date = record.confirmedAt!.toISOString().split('T')[0];

    if (!dailyStats[date]) {
      dailyStats[date] = {
        intake: 0,
        output: 0,
        balance: 0,
        items: {},
      };
    }

    const stats = dailyStats[date];
    if (record.recordType === 'intake') {
      stats.intake += record.amount;
    } else {
      stats.output += record.amount;
    }

    if (!stats.items[record.itemName]) {
      stats.items[record.itemName] = { intake: 0, output: 0 };
    }
    if (record.recordType === 'intake') {
      stats.items[record.itemName].intake += record.amount;
    } else {
      stats.items[record.itemName].output += record.amount;
    }
  }

  // Calculate balances
  for (const date in dailyStats) {
    dailyStats[date].balance = dailyStats[date].intake - dailyStats[date].output;
  }

  // Calculate totals
  const totals: RecordStats = {
    intake: 0,
    output: 0,
    balance: 0,
    items: {},
  };

  for (const stats of Object.values(dailyStats)) {
    totals.intake += stats.intake;
    totals.output += stats.output;

    for (const [item, amounts] of Object.entries(stats.items)) {
      if (!totals.items[item]) {
        totals.items[item] = { intake: 0, output: 0 };
      }
      totals.items[item].intake += amounts.intake;
      totals.items[item].output += amounts.output;
    }
  }

  totals.balance = totals.intake - totals.output;

  return res.json(success({
    patient: {
      id: patient.id,
      name: patient.name,
      hospitalNumber: patient.hospitalNumber,
      bedNumber: patient.bedNumber,
    },
    days,
    dailyStats,
    totals,
  }));
}));

/**
 * GET /shift - Statistics by shift
 * Query params: date, shiftId, patientId, bedNumber
 */
router.get('/shift', auth, asyncHandler(async (req: Request, res: Response) => {
  const date = req.query.date as string;
  const shiftId = req.query.shiftId as string;
  const patientId = req.query.patientId as string;
  const bedNumber = req.query.bedNumber as string;

  if (!date) {
    return res.status(400).json(error('Date is required', 400));
  }

  let shifts: any[] = [];

  if (shiftId) {
    // Get specific shift
    const shift = await prisma.shiftConfig.findUnique({
      where: { id: shiftId },
    });
    if (shift) {
      shifts = [shift];
    }
  } else {
    // Get all shifts
    shifts = await prisma.shiftConfig.findMany({
      where: { isDefault: true },
      orderBy: { startTime: 'asc' },
    });

    // If no default shifts, get all
    if (shifts.length === 0) {
      shifts = await prisma.shiftConfig.findMany({
        orderBy: { startTime: 'asc' },
      });
    }
  }

  const shiftStats: any[] = [];

  for (const shift of shifts) {
    // Parse shift times
    const [startHour, startMinute] = shift.startTime.split(':').map(Number);
    const [endHour, endMinute] = shift.endTime.split(':').map(Number);

    const shiftStart = new Date(date);
    shiftStart.setHours(startHour, startMinute, 0, 0);

    const shiftEnd = new Date(date);
    shiftEnd.setHours(endHour, endMinute, 0, 0);

    // Handle cross-day shifts
    if (endHour < startHour) {
      shiftEnd.setDate(shiftEnd.getDate() + 1);
    }

    // Build filter
    const where: any = {
      isDeleted: false,
      confirmedAt: {
        not: null,
        gte: shiftStart,
        lte: shiftEnd,
      },
    };

    if (patientId) {
      where.patientId = patientId;
    }

    if (bedNumber) {
      where.bedNumber = bedNumber;
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
      select: {
        recordType: true,
        itemName: true,
        amount: true,
      },
    });

    // Calculate statistics
    const stats: RecordStats = {
      intake: 0,
      output: 0,
      balance: 0,
      items: {},
    };

    for (const record of records) {
      if (record.recordType === 'intake') {
        stats.intake += record.amount;
      } else {
        stats.output += record.amount;
      }

      if (!stats.items[record.itemName]) {
        stats.items[record.itemName] = { intake: 0, output: 0 };
      }
      if (record.recordType === 'intake') {
        stats.items[record.itemName].intake += record.amount;
      } else {
        stats.items[record.itemName].output += record.amount;
      }
    }

    stats.balance = stats.intake - stats.output;

    shiftStats.push({
      shift: {
        id: shift.id,
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
      },
      startTime: shiftStart,
      endTime: shiftEnd,
      stats,
      recordCount: records.length,
    });
  }

  return res.json(success({
    date,
    shifts: shiftStats,
  }));
}));

export default router;
