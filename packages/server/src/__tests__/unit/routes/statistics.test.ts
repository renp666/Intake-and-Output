/**
 * Unit tests for src/routes/statistics.ts
 * Tests statistics endpoints with mocked Prisma
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { mockPrismaInstance, resetMockPrisma } from '../../helpers/mockPrisma';
import { mockPatient, mockBed } from '../../helpers/fixtures';

// Mock prisma
vi.mock('../../../lib/prisma', () => ({
  prisma: mockPrismaInstance,
}));

// Mock index to prevent server startup
vi.mock('../../../index', () => ({
  asyncHandler: (fn: any) => fn,
  default: {},
}));

import statisticsRouter from '../../../routes/statistics';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/statistics', statisticsRouter);
  return app;
}

function makeToken(userId = 'user-1', role = 'admin') {
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
    const server = app.listen(0, () => {
      const port = (server.address() as any).port;
      const url = `http://localhost:${port}${path}`;
      const fetchOptions: any = {
        method: method.toUpperCase(),
        headers: { 'Content-Type': 'application/json', ...options.headers },
      };
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

describe('Statistics Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    resetMockPrisma();
    app = createTestApp();
  });

  describe('GET /api/statistics/daily', () => {
    it('should return 24-hour statistics for a patient', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.intakeOutputRecord.findMany.mockResolvedValue([
        { recordType: 'intake', itemName: '口服液体', amount: 500, confirmedAt: new Date() },
        { recordType: 'intake', itemName: '静脉输液', amount: 1000, confirmedAt: new Date() },
        { recordType: 'output', itemName: '尿量', amount: 300, confirmedAt: new Date() },
        { recordType: 'output', itemName: '引流量', amount: 200, confirmedAt: new Date() },
      ]);

      const res = await request(app, 'GET', '/api/statistics/daily?patientId=patient-1', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.stats.intake).toBe(1500);
      expect(res.body.data.stats.output).toBe(500);
      expect(res.body.data.stats.balance).toBe(1000);
      expect(res.body.data.recordCount).toBe(4);

      // Check per-item breakdown
      expect(res.body.data.stats.items['口服液体'].intake).toBe(500);
      expect(res.body.data.stats.items['静脉输液'].intake).toBe(1000);
      expect(res.body.data.stats.items['尿量'].output).toBe(300);
      expect(res.body.data.stats.items['引流量'].output).toBe(200);
    });

    it('should return statistics by bed number', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.intakeOutputRecord.findMany.mockResolvedValue([
        { recordType: 'intake', itemName: '口服液体', amount: 200, confirmedAt: new Date() },
      ]);

      const res = await request(app, 'GET', '/api/statistics/daily?bedNumber=A001', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.stats.intake).toBe(200);
    });

    it('should return 400 when neither patientId nor bedNumber is provided', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();

      const res = await request(app, 'GET', '/api/statistics/daily', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Patient ID or bed number is required');
    });

    it('should return 401 without auth when querying by bed number', async () => {
      const res = await request(app, 'GET', '/api/statistics/daily?bedNumber=A001');
      expect(res.status).toBe(401);
    });

    it('should allow patient-side daily statistics query without jwt when patientId is provided', async () => {
      const p = mockPrismaInstance as any;
      p.intakeOutputRecord.findMany.mockResolvedValue([
        { recordType: 'intake', itemName: '饮水', amount: 200, confirmedAt: new Date() },
        { recordType: 'intake', itemName: '饮水', amount: 100, confirmedAt: new Date() },
        { recordType: 'output', itemName: '尿量', amount: 150, confirmedAt: new Date() },
      ]);

      const res = await request(app, 'GET', '/api/statistics/daily?patientId=patient-1&type=rolling', {
        headers: { authorization: 'Bearer bed-A001-device' },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.stats.items['饮水'].intake).toBe(300);
      expect(res.body.data.stats.items['饮水'].intakeCount).toBe(2);
      expect(res.body.data.stats.items['尿量'].outputCount).toBe(1);
    });

    it('should handle empty record set', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.intakeOutputRecord.findMany.mockResolvedValue([]);

      const res = await request(app, 'GET', '/api/statistics/daily?patientId=patient-1', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.stats.intake).toBe(0);
      expect(res.body.data.stats.output).toBe(0);
      expect(res.body.data.stats.balance).toBe(0);
      expect(res.body.data.recordCount).toBe(0);
    });

    it('should support cumulative type', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.intakeOutputRecord.findMany.mockResolvedValue([
        { recordType: 'intake', itemName: '口服液体', amount: 300, confirmedAt: new Date() },
      ]);

      const res = await request(app, 'GET', '/api/statistics/daily?patientId=patient-1&type=cumulative', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.type).toBe('cumulative');
    });
  });

  describe('GET /api/statistics/custom', () => {
    it('should return custom time range statistics', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.intakeOutputRecord.findMany.mockResolvedValue([
        { recordType: 'intake', itemName: '口服液体', amount: 2000, confirmedAt: new Date() },
        { recordType: 'output', itemName: '尿量', amount: 1500, confirmedAt: new Date() },
      ]);

      const res = await request(
        app,
        'GET',
        '/api/statistics/custom?startDate=2025-06-01&endDate=2025-06-02&patientId=patient-1',
        { headers: { authorization: `Bearer ${token}` } }
      );

      expect(res.status).toBe(200);
      expect(res.body.data.stats.intake).toBe(2000);
      expect(res.body.data.stats.output).toBe(1500);
      expect(res.body.data.stats.balance).toBe(500);
      expect(res.body.data.recordCount).toBe(2);
    });

    it('should return 400 when dates are missing', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();

      const res = await request(app, 'GET', '/api/statistics/custom?patientId=patient-1', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Start date and end date are required');
    });

    it('should return 401 without auth', async () => {
      const res = await request(
        app,
        'GET',
        '/api/statistics/custom?startDate=2025-06-01&endDate=2025-06-02'
      );
      expect(res.status).toBe(401);
    });

    it('should handle empty result set with zero totals', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.intakeOutputRecord.findMany.mockResolvedValue([]);

      const res = await request(
        app,
        'GET',
        '/api/statistics/custom?startDate=2025-06-01&endDate=2025-06-02&patientId=patient-1',
        { headers: { authorization: `Bearer ${token}` } }
      );

      expect(res.status).toBe(200);
      expect(res.body.data.stats.intake).toBe(0);
      expect(res.body.data.stats.output).toBe(0);
      expect(res.body.data.stats.balance).toBe(0);
    });
  });

  describe('GET /api/statistics/patient/:id', () => {
    it('should return patient statistics with daily breakdown', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.patient.findUnique.mockResolvedValue(mockPatient);
      p.intakeOutputRecord.findMany.mockResolvedValue([
        {
          recordType: 'intake',
          itemName: '口服液体',
          amount: 500,
          confirmedAt: new Date('2025-06-01T10:00:00Z'),
          recordTime: new Date('2025-06-01T10:00:00Z'),
        },
        {
          recordType: 'output',
          itemName: '尿量',
          amount: 300,
          confirmedAt: new Date('2025-06-01T14:00:00Z'),
          recordTime: new Date('2025-06-01T14:00:00Z'),
        },
        {
          recordType: 'intake',
          itemName: '口服液体',
          amount: 400,
          confirmedAt: new Date('2025-06-02T09:00:00Z'),
          recordTime: new Date('2025-06-02T09:00:00Z'),
        },
      ]);

      const res = await request(app, 'GET', '/api/statistics/patient/patient-1?days=2', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.patient.id).toBe('patient-1');
      expect(res.body.data.totals.intake).toBe(900);
      expect(res.body.data.totals.output).toBe(300);
      expect(res.body.data.totals.balance).toBe(600);
    });

    it('should return 404 for nonexistent patient', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.patient.findUnique.mockResolvedValue(null);

      const res = await request(app, 'GET', '/api/statistics/patient/nonexistent', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(404);
    });
  });
});
