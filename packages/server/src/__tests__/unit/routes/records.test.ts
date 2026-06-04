/**
 * Unit tests for src/routes/records.ts
 * Tests intake/output record endpoints with mocked Prisma
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { mockPrismaInstance, resetMockPrisma } from '../../helpers/mockPrisma';
import {
  mockPatient,
  mockDischargedPatient,
  mockBed,
  mockIntakeRecord,
  mockOutputRecord,
  mockConfirmedRecord,
  mockDeletedRecord,
  mockPresetItemNurseOnly,
  mockPresetItemSelf,
  mockOperationLog,
} from '../../helpers/fixtures';

// Mock prisma
vi.mock('../../../lib/prisma', () => ({
  prisma: mockPrismaInstance,
}));

// Mock index to prevent server startup
vi.mock('../../../index', () => ({
  asyncHandler: (fn: any) => fn,
  default: {},
}));

// Mock alert utility
vi.mock('../../../utils/alert', () => ({
  checkPatientAlerts: vi.fn().mockResolvedValue(undefined),
}));

// Mock jsonwebtoken for inline token parsing in route handlers
vi.mock('jsonwebtoken', async () => {
  const actual = await vi.importActual<typeof import('jsonwebtoken')>('jsonwebtoken');
  return {
    ...actual,
    default: actual,
  };
});

import recordsRouter from '../../../routes/records';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/records', recordsRouter);
  return app;
}

function makeToken(userId = 'user-1', role = 'nurse') {
  return jwt.sign(
    { userId, username: 'testuser', role, name: 'Test', departmentId: 'dept-1' },
    process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing',
    { expiresIn: '1h' }
  );
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
        headers: { 'Content-Type': 'application/json', ...options.headers },
      };
      if (options.body && method.toUpperCase() !== 'GET') {
        fetchOptions.body = JSON.stringify(options.body);
      }
      fetch(url, fetchOptions)
        .then(async (res) => {
          const body = await res.json();
          server.close();
          resolve({ status: res.status, body });
        })
        .catch((err) => { server.close(); reject(err); });
    });
  });
}

describe('Records Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    resetMockPrisma();
    app = createTestApp();
  });

  describe('POST /api/records', () => {
    it('should create an intake record', async () => {
      const p = mockPrismaInstance as any;
      p.patient.findUnique.mockResolvedValue(mockPatient);
      p.bed.findFirst.mockResolvedValue(mockBed);
      p.intakeOutputRecord.create.mockResolvedValue(mockIntakeRecord);
      p.recordChangeLog.create.mockResolvedValue({});

      const res = await request(app, 'POST', '/api/records', {
        headers: { authorization: `Bearer ${makeToken()}` },
        body: {
          patientId: 'patient-1',
          recordType: 'intake',
          itemName: '口服液体',
          amount: 200,
          unit: 'ml',
        },
      });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(200);
      expect(res.body.message).toBe('Record created successfully');
    });

    it('should create an output record', async () => {
      const p = mockPrismaInstance as any;
      p.patient.findUnique.mockResolvedValue(mockPatient);
      p.bed.findFirst.mockResolvedValue(mockBed);
      p.intakeOutputRecord.create.mockResolvedValue(mockOutputRecord);
      p.recordChangeLog.create.mockResolvedValue({});

      const res = await request(app, 'POST', '/api/records', {
        headers: { authorization: `Bearer ${makeToken()}` },
        body: {
          patientId: 'patient-1',
          recordType: 'output',
          itemName: '尿量',
          amount: 300,
          unit: 'ml',
        },
      });

      expect(res.status).toBe(201);
    });

    it('should reject nurse_only items for patients (no token)', async () => {
      const p = mockPrismaInstance as any;
      p.patient.findUnique.mockResolvedValue(mockPatient);
      p.presetItem.findFirst.mockResolvedValue(mockPresetItemNurseOnly);

      const res = await request(app, 'POST', '/api/records', {
        body: {
          patientId: 'patient-1',
          recordType: 'intake',
          itemName: '静脉输液',
          amount: 500,
          unit: 'ml',
        },
      });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('nurses');
    });

    it('should return 400 for discharged patients', async () => {
      const p = mockPrismaInstance as any;
      p.patient.findUnique.mockResolvedValue(mockDischargedPatient);

      const res = await request(app, 'POST', '/api/records', {
        body: {
          patientId: 'patient-discharged',
          recordType: 'intake',
          itemName: 'test',
          amount: 100,
          unit: 'ml',
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Patient has been discharged');
    });

    it('should return 404 when patient not found', async () => {
      const p = mockPrismaInstance as any;
      p.patient.findUnique.mockResolvedValue(null);

      const res = await request(app, 'POST', '/api/records', {
        body: {
          patientId: 'nonexistent',
          recordType: 'intake',
          itemName: 'test',
          amount: 100,
          unit: 'ml',
        },
      });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/records', () => {
    it('should return paginated records', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.bed.findMany.mockResolvedValue([mockBed]);
      p.intakeOutputRecord.findMany.mockResolvedValue([mockIntakeRecord, mockOutputRecord]);
      p.intakeOutputRecord.count.mockResolvedValue(2);

      const res = await request(app, 'GET', '/api/records?page=1&pageSize=20', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.total).toBe(2);
    });

    it('should filter by status=pending', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.bed.findMany.mockResolvedValue([mockBed]);
      p.intakeOutputRecord.findMany.mockResolvedValue([mockIntakeRecord]);
      p.intakeOutputRecord.count.mockResolvedValue(1);

      const res = await request(app, 'GET', '/api/records?status=pending', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app, 'GET', '/api/records');
      expect(res.status).toBe(401);
    });

    it('should allow patients to query their own records without jwt', async () => {
      const p = mockPrismaInstance as any;
      p.intakeOutputRecord.findMany.mockResolvedValue([mockIntakeRecord]);
      p.intakeOutputRecord.count.mockResolvedValue(1);

      const res = await request(app, 'GET', '/api/records?patientId=patient-1&page=1&pageSize=20');

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(p.intakeOutputRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            patientId: 'patient-1',
            isDeleted: false,
          }),
        })
      );
    });
  });

  describe('PUT /api/records/:id', () => {
    it('should update a pending record', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      const updatedRecord = { ...mockIntakeRecord, amount: 300 };
      p.intakeOutputRecord.findUnique.mockResolvedValue(mockIntakeRecord);
      p.intakeOutputRecord.update.mockResolvedValue(updatedRecord);
      p.recordChangeLog.createMany.mockResolvedValue({});
      p.operationLog.create.mockResolvedValue({});

      const res = await request(app, 'PUT', '/api/records/record-1', {
        headers: { authorization: `Bearer ${token}` },
        body: { amount: 300, operator_name: 'Nurse Zhang' },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Record updated successfully');
    });

    it('should reject updating a confirmed record by patient', async () => {
      const p = mockPrismaInstance as any;
      // No token = patient
      p.intakeOutputRecord.findUnique.mockResolvedValue(mockConfirmedRecord);

      const res = await request(app, 'PUT', '/api/records/record-confirmed', {
        body: { amount: 300 },
      });

      expect(res.status).toBe(403);
    });

    it('should return 404 for nonexistent record', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.intakeOutputRecord.findUnique.mockResolvedValue(null);

      const res = await request(app, 'PUT', '/api/records/nonexistent', {
        headers: { authorization: `Bearer ${token}` },
        body: { amount: 300, operator_name: 'Nurse' },
      });

      expect(res.status).toBe(404);
    });

    it('should return 400 for deleted record', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.intakeOutputRecord.findUnique.mockResolvedValue(mockDeletedRecord);

      const res = await request(app, 'PUT', '/api/records/record-deleted', {
        headers: { authorization: `Bearer ${token}` },
        body: { amount: 300, operator_name: 'Nurse' },
      });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/records/:id', () => {
    it('should soft delete a pending record', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.intakeOutputRecord.findUnique.mockResolvedValue(mockIntakeRecord);
      p.intakeOutputRecord.update.mockResolvedValue({});
      p.recordChangeLog.create.mockResolvedValue({});
      p.operationLog.create.mockResolvedValue({});

      const res = await request(app, 'DELETE', '/api/records/record-1', {
        headers: { authorization: `Bearer ${token}` },
        body: { operator_name: 'Nurse Zhang' },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Record deleted successfully');
    });

    it('should reject deleting a confirmed record by patient', async () => {
      const p = mockPrismaInstance as any;
      p.intakeOutputRecord.findUnique.mockResolvedValue(mockConfirmedRecord);

      const res = await request(app, 'DELETE', '/api/records/record-confirmed', {});
      expect(res.status).toBe(403);
    });

    it('should return 400 for already deleted record', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.intakeOutputRecord.findUnique.mockResolvedValue(mockDeletedRecord);

      const res = await request(app, 'DELETE', '/api/records/record-deleted', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/records/:id/restore', () => {
    it('should allow patients to restore their deleted record without jwt', async () => {
      const p = mockPrismaInstance as any;
      p.intakeOutputRecord.findUnique.mockResolvedValue(mockDeletedRecord);
      p.intakeOutputRecord.update.mockResolvedValue(mockIntakeRecord);
      p.recordChangeLog.create.mockResolvedValue({});
      p.operationLog.create.mockResolvedValue({});

      const res = await request(app, 'POST', '/api/records/record-deleted/restore');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Record restored successfully');
    });
  });

  describe('POST /api/records/:id/confirm', () => {
    it('should confirm a pending record', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.intakeOutputRecord.findUnique.mockResolvedValue(mockIntakeRecord);
      p.intakeOutputRecord.update.mockResolvedValue(mockConfirmedRecord);
      p.recordChangeLog.create.mockResolvedValue({});
      p.operationLog.create.mockResolvedValue({});

      const res = await request(app, 'POST', '/api/records/record-1/confirm', {
        headers: { authorization: `Bearer ${token}` },
        body: { operator_name: 'Nurse Zhang' },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Record confirmed successfully');
    });

    it('should reject confirming an already confirmed record', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.intakeOutputRecord.findUnique.mockResolvedValue(mockConfirmedRecord);

      const res = await request(app, 'POST', '/api/records/record-confirmed/confirm', {
        headers: { authorization: `Bearer ${token}` },
        body: { operator_name: 'Nurse' },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Record is already confirmed');
    });

    it('should return 401 for non-nurse/non-admin users', async () => {
      const token = makeToken('user-1', 'patient');
      const res = await request(app, 'POST', '/api/records/record-1/confirm', {
        headers: { authorization: `Bearer ${token}` },
        body: { operator_name: 'Nurse' },
      });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/records/:id/unconfirm', () => {
    it('should unconfirm a record (admin only)', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken('admin-1', 'admin');
      p.intakeOutputRecord.findUnique.mockResolvedValue(mockConfirmedRecord);
      p.intakeOutputRecord.update.mockResolvedValue(mockIntakeRecord);
      p.recordChangeLog.create.mockResolvedValue({});
      p.operationLog.create.mockResolvedValue({});

      const res = await request(app, 'POST', '/api/records/record-confirmed/unconfirm', {
        headers: { authorization: `Bearer ${token}` },
        body: { operator_name: 'Admin' },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Record unconfirmed successfully');
    });

    it('should reject unconfirming for non-admin users', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken('user-1', 'nurse');
      p.intakeOutputRecord.findUnique.mockResolvedValue(mockConfirmedRecord);

      const res = await request(app, 'POST', '/api/records/record-confirmed/unconfirm', {
        headers: { authorization: `Bearer ${token}` },
        body: { operator_name: 'Nurse' },
      });

      expect(res.status).toBe(403);
    });

    it('should reject unconfirming a non-confirmed record', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken('admin-1', 'admin');
      p.intakeOutputRecord.findUnique.mockResolvedValue(mockIntakeRecord);

      const res = await request(app, 'POST', '/api/records/record-1/unconfirm', {
        headers: { authorization: `Bearer ${token}` },
        body: { operator_name: 'Admin' },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Record is not confirmed');
    });
  });
});
