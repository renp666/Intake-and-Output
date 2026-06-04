/**
 * Unit tests for src/routes/export.ts
 * Tests Excel and PDF export endpoints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { mockPrismaInstance, resetMockPrisma } from '../../helpers/mockPrisma';
import {
  mockUser,
  mockAdminUser,
  mockPatient,
  mockIntakeRecord,
  mockOutputRecord,
  mockConfirmedRecord,
  mockOperationLog,
} from '../../helpers/fixtures';

// Mock prisma module
vi.mock('../../../lib/prisma', () => ({
  prisma: mockPrismaInstance,
}));

// Mock the index module
vi.mock('../../../index', () => ({
  asyncHandler: (fn: any) => fn,
  default: {},
}));

import exportRouter from '../../../routes/export';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/export', exportRouter);
  return app;
}

async function request(app: express.Application, method: string, path: string, options: {
  body?: any;
  headers?: Record<string, string>;
} = {}) {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const port = (server.address() as any).port;
      const url = `http://127.0.0.1:${port}${path}`;

      const fetchOptions: any = {
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      };

      fetch(url, fetchOptions)
        .then(async (res) => {
          const body = await res.json();
          server.close();
          resolve({ status: res.status, body });
        })
        .catch((err) => {
          server.close();
          reject(err);
        });
    });
  });
}

function makeToken(payload: any = {}) {
  return jwt.sign(
    { userId: 'user-1', username: 'nurse01', role: 'nurse', name: '张护士', departmentId: 'dept-1', ...payload },
    process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing',
    { expiresIn: '1h' }
  );
}

describe('Export Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    resetMockPrisma();
    app = createTestApp();
  });

  describe('GET /api/export/excel', () => {
    it('should export records as JSON with valid date range', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'admin' });
      const confirmedIntake = { ...mockIntakeRecord, confirmedAt: new Date('2025-06-01T11:00:00Z'), confirmer: { name: '张护士' } };
      const confirmedOutput = { ...mockOutputRecord, confirmedAt: new Date('2025-06-01T12:00:00Z'), confirmer: { name: '张护士' } };
      p.intakeOutputRecord.findMany.mockResolvedValue([confirmedIntake, confirmedOutput]);
      p.operationLog.create.mockResolvedValue(mockOperationLog);

      const res = await request(app, 'GET', '/api/export/excel?startDate=2025-06-01&endDate=2025-06-02', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.records).toHaveLength(2);
      expect(res.body.data.statistics.totalIntake).toBe(200);
      expect(res.body.data.statistics.totalOutput).toBe(300);
      expect(res.body.data.statistics.balance).toBe(-100);
      expect(res.body.data.exportTime).toBeDefined();
    });

    it('should filter by patientId', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'admin' });
      p.intakeOutputRecord.findMany.mockResolvedValue([mockConfirmedRecord]);
      p.operationLog.create.mockResolvedValue(mockOperationLog);

      await request(app, 'GET', '/api/export/excel?startDate=2025-06-01&endDate=2025-06-02&patientId=patient-1', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(p.intakeOutputRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ patientId: 'patient-1' }),
        })
      );
    });

    it('should filter by department for nurse role', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'nurse', departmentId: 'dept-1' });
      p.bed.findMany.mockResolvedValue([{ bedNumber: 'A001' }]);
      p.intakeOutputRecord.findMany.mockResolvedValue([]);
      p.operationLog.create.mockResolvedValue(mockOperationLog);

      const res = await request(app, 'GET', '/api/export/excel?startDate=2025-06-01&endDate=2025-06-02', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(p.bed.findMany).toHaveBeenCalled();
    });

    it('should return 400 when dates are missing', async () => {
      const token = makeToken({ role: 'admin' });

      const res = await request(app, 'GET', '/api/export/excel', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Start date and end date are required');
    });

    it('should return 400 when only startDate provided', async () => {
      const token = makeToken({ role: 'admin' });

      const res = await request(app, 'GET', '/api/export/excel?startDate=2025-06-01', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(400);
    });

    it('should return 403 for patient role', async () => {
      const token = makeToken({ role: 'patient' });

      const res = await request(app, 'GET', '/api/export/excel?startDate=2025-06-01&endDate=2025-06-02', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/export/pdf', () => {
    it('should export patient records as JSON', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'admin' });
      p.patient.findUnique.mockResolvedValue(mockPatient);
      p.intakeOutputRecord.findMany.mockResolvedValue([mockConfirmedRecord]);
      p.operationLog.create.mockResolvedValue(mockOperationLog);

      const res = await request(app, 'GET', '/api/export/pdf?startDate=2025-06-01&endDate=2025-06-02&patientId=patient-1', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.patient.name).toBe('李四');
      expect(res.body.data.records).toHaveLength(1);
      expect(res.body.data.statistics).toBeDefined();
    });

    it('should return 400 when dates are missing', async () => {
      const token = makeToken({ role: 'admin' });

      const res = await request(app, 'GET', '/api/export/pdf?patientId=patient-1', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Start date and end date are required');
    });

    it('should return 400 when patientId is missing', async () => {
      const token = makeToken({ role: 'admin' });

      const res = await request(app, 'GET', '/api/export/pdf?startDate=2025-06-01&endDate=2025-06-02', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Patient ID is required for PDF export');
    });

    it('should return 404 when patient not found', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'admin' });
      p.patient.findUnique.mockResolvedValue(null);

      const res = await request(app, 'GET', '/api/export/pdf?startDate=2025-06-01&endDate=2025-06-02&patientId=nonexistent', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Patient not found');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app, 'GET', '/api/export/pdf?startDate=2025-06-01&endDate=2025-06-02&patientId=patient-1');
      expect(res.status).toBe(401);
    });
  });
});
