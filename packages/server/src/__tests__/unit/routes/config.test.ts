/**
 * Unit tests for src/routes/config.ts
 * Tests system config CRUD and shift config management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { mockPrismaInstance, resetMockPrisma } from '../../helpers/mockPrisma';
import {
  mockAdminUser,
  mockUser,
  mockShiftConfig,
  mockOperationLog,
  mockSystemConfigs,
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

import configRouter from '../../../routes/config';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/config', configRouter);
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
    { userId: 'admin-1', username: 'admin', role: 'admin', name: '管理员', ...payload },
    process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing',
    { expiresIn: '1h' }
  );
}

describe('Config Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    resetMockPrisma();
    app = createTestApp();
  });

  describe('GET /api/config', () => {
    it('should return all system configs as key-value map', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.systemConfig.findMany.mockResolvedValue(mockSystemConfigs);

      const res = await request(app, 'GET', '/api/config', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.data['alert.oliguria_factor']).toBe('12');
      expect(res.body.data['alert.polyuria']).toBe('2500');
    });

    it('should return empty map when no configs exist', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.systemConfig.findMany.mockResolvedValue([]);

      const res = await request(app, 'GET', '/api/config', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(Object.keys(res.body.data)).toHaveLength(0);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app, 'GET', '/api/config');
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/config', () => {
    it('should update system configs (admin only)', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.systemConfig.upsert.mockResolvedValue({});
      p.operationLog.create.mockResolvedValue(mockOperationLog);

      const res = await request(app, 'PUT', '/api/config', {
        headers: { authorization: `Bearer ${token}` },
        body: { 'site.name': '出入量系统', 'site.version': '1.0.0' },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Config updated successfully');
      expect(p.systemConfig.upsert).toHaveBeenCalledTimes(2);
      expect(p.operationLog.create).toHaveBeenCalled();
    });

    it('should return 403 for non-admin users', async () => {
      const token = makeToken({ role: 'nurse' });

      const res = await request(app, 'PUT', '/api/config', {
        headers: { authorization: `Bearer ${token}` },
        body: { 'site.name': 'test' },
      });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/config/shifts', () => {
    it('should return all shift configs', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.shiftConfig.findMany.mockResolvedValue([mockShiftConfig]);

      const res = await request(app, 'GET', '/api/config/shifts', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('白班');
    });

    it('should return empty array when no shifts exist', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.shiftConfig.findMany.mockResolvedValue([]);

      const res = await request(app, 'GET', '/api/config/shifts', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('POST /api/config/shifts', () => {
    it('should create a new shift config', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.shiftConfig.create.mockResolvedValue(mockShiftConfig);
      p.operationLog.create.mockResolvedValue(mockOperationLog);

      const res = await request(app, 'POST', '/api/config/shifts', {
        headers: { authorization: `Bearer ${token}` },
        body: { name: '白班', startTime: '08:00', endTime: '16:00', isDefault: true },
      });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Shift created successfully');
      expect(res.body.data.name).toBe('白班');
    });

    it('should unset other defaults when creating default shift', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.shiftConfig.updateMany.mockResolvedValue({});
      p.shiftConfig.create.mockResolvedValue(mockShiftConfig);
      p.operationLog.create.mockResolvedValue(mockOperationLog);

      await request(app, 'POST', '/api/config/shifts', {
        headers: { authorization: `Bearer ${token}` },
        body: { name: '白班', startTime: '08:00', endTime: '16:00', isDefault: true },
      });

      expect(p.shiftConfig.updateMany).toHaveBeenCalledWith({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    });

    it('should return 400 for invalid time format', async () => {
      const token = makeToken();

      const res = await request(app, 'POST', '/api/config/shifts', {
        headers: { authorization: `Bearer ${token}` },
        body: { name: '白班', startTime: '8:00', endTime: '16:00' },
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing name', async () => {
      const token = makeToken();

      const res = await request(app, 'POST', '/api/config/shifts', {
        headers: { authorization: `Bearer ${token}` },
        body: { startTime: '08:00', endTime: '16:00' },
      });

      expect(res.status).toBe(400);
    });

    it('should return 403 for non-admin', async () => {
      const token = makeToken({ role: 'nurse' });

      const res = await request(app, 'POST', '/api/config/shifts', {
        headers: { authorization: `Bearer ${token}` },
        body: { name: '夜班', startTime: '00:00', endTime: '08:00' },
      });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/config/shifts/:id', () => {
    it('should update an existing shift', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.shiftConfig.findUnique.mockResolvedValue(mockShiftConfig);
      p.shiftConfig.update.mockResolvedValue({ ...mockShiftConfig, name: '早班' });
      p.operationLog.create.mockResolvedValue(mockOperationLog);

      const res = await request(app, 'PUT', '/api/config/shifts/shift-1', {
        headers: { authorization: `Bearer ${token}` },
        body: { name: '早班' },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Shift updated successfully');
    });

    it('should unset other defaults when setting as default', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.shiftConfig.findUnique.mockResolvedValue(mockShiftConfig);
      p.shiftConfig.updateMany.mockResolvedValue({});
      p.shiftConfig.update.mockResolvedValue(mockShiftConfig);
      p.operationLog.create.mockResolvedValue(mockOperationLog);

      await request(app, 'PUT', '/api/config/shifts/shift-1', {
        headers: { authorization: `Bearer ${token}` },
        body: { isDefault: true },
      });

      expect(p.shiftConfig.updateMany).toHaveBeenCalledWith({
        where: { isDefault: true, id: { not: 'shift-1' } },
        data: { isDefault: false },
      });
    });

    it('should return 404 for non-existent shift', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.shiftConfig.findUnique.mockResolvedValue(null);

      const res = await request(app, 'PUT', '/api/config/shifts/nonexistent', {
        headers: { authorization: `Bearer ${token}` },
        body: { name: 'test' },
      });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Shift not found');
    });
  });

  describe('DELETE /api/config/shifts/:id', () => {
    it('should delete an existing shift', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.shiftConfig.findUnique.mockResolvedValue(mockShiftConfig);
      p.shiftConfig.delete.mockResolvedValue(mockShiftConfig);
      p.operationLog.create.mockResolvedValue(mockOperationLog);

      const res = await request(app, 'DELETE', '/api/config/shifts/shift-1', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Shift deleted successfully');
      expect(p.shiftConfig.delete).toHaveBeenCalled();
    });

    it('should return 404 for non-existent shift', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.shiftConfig.findUnique.mockResolvedValue(null);

      const res = await request(app, 'DELETE', '/api/config/shifts/nonexistent', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Shift not found');
    });

    it('should return 403 for non-admin', async () => {
      const token = makeToken({ role: 'nurse' });

      const res = await request(app, 'DELETE', '/api/config/shifts/shift-1', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(403);
    });
  });
});
