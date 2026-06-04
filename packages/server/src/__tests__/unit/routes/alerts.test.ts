/**
 * Unit tests for src/routes/alerts.ts
 * Tests alert listing, config CRUD, read/handle operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { mockPrismaInstance, resetMockPrisma } from '../../helpers/mockPrisma';
import {
  mockUser,
  mockAdminUser,
  mockAlertRecord,
  mockReadAlert,
  mockHandledAlert,
  mockBed,
  mockSystemConfigs,
  mockOperationLog,
} from '../../helpers/fixtures';

// Mock prisma module
vi.mock('../../../lib/prisma', () => ({
  prisma: mockPrismaInstance,
}));

// Mock the index module to prevent server startup and provide asyncHandler
vi.mock('../../../index', () => ({
  asyncHandler: (fn: any) => fn,
  default: {},
}));

// Import AFTER mocks are set up
import alertsRouter from '../../../routes/alerts';

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/alerts', alertsRouter);
  return app;
}

// Helper to make HTTP requests to test app
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

      if (options.body && method.toUpperCase() !== 'GET') {
        fetchOptions.body = JSON.stringify(options.body);
      }

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

describe('Alerts Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    resetMockPrisma();
    app = createTestApp();
  });

  describe('GET /api/alerts', () => {
    it('should return paginated alerts for admin', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'admin' });
      p.alertRecord.findMany.mockResolvedValue([mockAlertRecord]);
      p.alertRecord.count.mockResolvedValue(1);

      const res = await request(app, 'GET', '/api/alerts', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
    });

    it('should filter alerts by patientId', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'admin' });
      p.alertRecord.findMany.mockResolvedValue([mockAlertRecord]);
      p.alertRecord.count.mockResolvedValue(1);

      const res = await request(app, 'GET', '/api/alerts?patientId=patient-1', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(p.alertRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ patientId: 'patient-1' }),
        })
      );
    });

    it('should filter alerts by alertType', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'admin' });
      p.alertRecord.findMany.mockResolvedValue([]);
      p.alertRecord.count.mockResolvedValue(0);

      await request(app, 'GET', '/api/alerts?alertType=oliguria', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(p.alertRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ alertType: 'oliguria' }),
        })
      );
    });

    it('should filter alerts by alertLevel', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'admin' });
      p.alertRecord.findMany.mockResolvedValue([]);
      p.alertRecord.count.mockResolvedValue(0);

      await request(app, 'GET', '/api/alerts?alertLevel=warning', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(p.alertRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ alertLevel: 'warning' }),
        })
      );
    });

    it('should filter alerts by isRead', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'admin' });
      p.alertRecord.findMany.mockResolvedValue([]);
      p.alertRecord.count.mockResolvedValue(0);

      await request(app, 'GET', '/api/alerts?isRead=false', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(p.alertRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isRead: false }),
        })
      );
    });

    it('should filter alerts by handled', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'admin' });
      p.alertRecord.findMany.mockResolvedValue([]);
      p.alertRecord.count.mockResolvedValue(0);

      await request(app, 'GET', '/api/alerts?handled=true', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(p.alertRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ handled: true }),
        })
      );
    });

    it('should filter by department for nurse role', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'nurse', departmentId: 'dept-1' });
      p.bed.findMany.mockResolvedValue([{ patientId: 'patient-1' }]);
      p.alertRecord.findMany.mockResolvedValue([mockAlertRecord]);
      p.alertRecord.count.mockResolvedValue(1);

      const res = await request(app, 'GET', '/api/alerts', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(p.bed.findMany).toHaveBeenCalled();
    });

    it('should return empty when nurse has no department beds', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'nurse', departmentId: 'dept-1' });
      p.bed.findMany.mockResolvedValue([]);

      const res = await request(app, 'GET', '/api/alerts', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(0);
      expect(res.body.data.total).toBe(0);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app, 'GET', '/api/alerts');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/alerts/config', () => {
    it('should return global alert thresholds', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'admin' });
      p.systemConfig.findMany.mockResolvedValue(mockSystemConfigs);

      const res = await request(app, 'GET', '/api/alerts/config', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.oliguria_factor).toBe(12);
      expect(res.body.data.oliguria_default).toBe(400);
      expect(res.body.data.polyuria).toBe(2500);
      expect(res.body.data.anuria).toBe(100);
      expect(res.body.data.imbalance).toBe(1000);
    });

    it('should return defaults when no configs exist', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'admin' });
      p.systemConfig.findMany.mockResolvedValue([]);

      const res = await request(app, 'GET', '/api/alerts/config', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.oliguria_factor).toBe(12);
      expect(res.body.data.polyuria).toBe(2500);
    });
  });

  describe('PUT /api/alerts/config', () => {
    it('should update alert thresholds (admin only)', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'admin' });
      p.systemConfig.upsert.mockResolvedValue({});
      p.operationLog.create.mockResolvedValue(mockOperationLog);

      const res = await request(app, 'PUT', '/api/alerts/config', {
        headers: { authorization: `Bearer ${token}` },
        body: { polyuria: 3000, anuria: 50 },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Alert config updated successfully');
      expect(p.systemConfig.upsert).toHaveBeenCalledTimes(2);
    });

    it('should return 403 for non-admin users', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'nurse' });

      const res = await request(app, 'PUT', '/api/alerts/config', {
        headers: { authorization: `Bearer ${token}` },
        body: { polyuria: 3000 },
      });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/alerts/:id', () => {
    it('should return single alert by id', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'admin' });
      p.alertRecord.findUnique.mockResolvedValue(mockAlertRecord);

      const res = await request(app, 'GET', '/api/alerts/alert-1', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('alert-1');
    });

    it('should return 404 for non-existent alert', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'admin' });
      p.alertRecord.findUnique.mockResolvedValue(null);

      const res = await request(app, 'GET', '/api/alerts/nonexistent', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Alert not found');
    });
  });

  describe('PUT /api/alerts/:id/read', () => {
    it('should mark unread alert as read', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'admin' });
      p.alertRecord.findUnique.mockResolvedValue(mockAlertRecord);
      p.alertRecord.update.mockResolvedValue(mockReadAlert);

      const res = await request(app, 'PUT', '/api/alerts/alert-1/read', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Alert marked as read');
      expect(p.alertRecord.update).toHaveBeenCalled();
    });

    it('should return early if alert is already read', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'admin' });
      p.alertRecord.findUnique.mockResolvedValue(mockReadAlert);

      const res = await request(app, 'PUT', '/api/alerts/alert-read/read', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Alert is already read');
    });

    it('should return 404 for non-existent alert', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'admin' });
      p.alertRecord.findUnique.mockResolvedValue(null);

      const res = await request(app, 'PUT', '/api/alerts/nonexistent/read', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/alerts/:id/handle', () => {
    it('should handle unhandled alert', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'nurse' });
      p.alertRecord.findUnique.mockResolvedValue(mockAlertRecord);
      p.alertRecord.update.mockResolvedValue(mockHandledAlert);
      p.operationLog.create.mockResolvedValue(mockOperationLog);

      const res = await request(app, 'PUT', '/api/alerts/alert-1/handle', {
        headers: { authorization: `Bearer ${token}` },
        body: { handleNotes: '已处理' },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Alert handled successfully');
      expect(p.operationLog.create).toHaveBeenCalled();
    });

    it('should return 400 for already handled alert', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'nurse' });
      p.alertRecord.findUnique.mockResolvedValue(mockHandledAlert);

      const res = await request(app, 'PUT', '/api/alerts/alert-handled/handle', {
        headers: { authorization: `Bearer ${token}` },
        body: { handleNotes: '再次处理' },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Alert is already handled');
    });

    it('should return 404 for non-existent alert', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken({ role: 'nurse' });
      p.alertRecord.findUnique.mockResolvedValue(null);

      const res = await request(app, 'PUT', '/api/alerts/nonexistent/handle', {
        headers: { authorization: `Bearer ${token}` },
        body: {},
      });

      expect(res.status).toBe(404);
    });
  });
});
