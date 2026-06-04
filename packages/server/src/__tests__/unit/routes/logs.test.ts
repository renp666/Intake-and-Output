/**
 * Unit tests for src/routes/logs.ts
 * Tests operation log listing with pagination and filtering
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { mockPrismaInstance, resetMockPrisma } from '../../helpers/mockPrisma';
import {
  mockAdminUser,
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

import logsRouter from '../../../routes/logs';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/logs', logsRouter);
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
    { userId: 'admin-1', username: 'admin', role: 'admin', name: '管理员', ...payload },
    process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing',
    { expiresIn: '1h' }
  );
}

describe('Logs Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    resetMockPrisma();
    app = createTestApp();
  });

  describe('GET /api/logs', () => {
    it('should return paginated operation logs (admin only)', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.operationLog.findMany.mockResolvedValue([mockOperationLog]);
      p.operationLog.count.mockResolvedValue(1);

      const res = await request(app, 'GET', '/api/logs', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.pageSize).toBe(20);
    });

    it('should support custom pagination', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.operationLog.findMany.mockResolvedValue([]);
      p.operationLog.count.mockResolvedValue(0);

      const res = await request(app, 'GET', '/api/logs?page=2&pageSize=10', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(p.operationLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    it('should filter by userId', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.operationLog.findMany.mockResolvedValue([]);
      p.operationLog.count.mockResolvedValue(0);

      await request(app, 'GET', '/api/logs?userId=user-1', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(p.operationLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1' }),
        })
      );
    });

    it('should filter by operationType', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.operationLog.findMany.mockResolvedValue([]);
      p.operationLog.count.mockResolvedValue(0);

      await request(app, 'GET', '/api/logs?operationType=create', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(p.operationLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ operationType: 'create' }),
        })
      );
    });

    it('should filter by targetTable', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.operationLog.findMany.mockResolvedValue([]);
      p.operationLog.count.mockResolvedValue(0);

      await request(app, 'GET', '/api/logs?targetTable=intake_output_records', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(p.operationLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ targetTable: 'intake_output_records' }),
        })
      );
    });

    it('should filter by date range', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.operationLog.findMany.mockResolvedValue([]);
      p.operationLog.count.mockResolvedValue(0);

      await request(app, 'GET', '/api/logs?startDate=2025-06-01&endDate=2025-06-02', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(p.operationLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should filter by search keyword', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.operationLog.findMany.mockResolvedValue([]);
      p.operationLog.count.mockResolvedValue(0);

      await request(app, 'GET', '/api/logs?search=Created', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(p.operationLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            detail: { contains: 'Created' },
          }),
        })
      );
    });

    it('should return 403 for non-admin users', async () => {
      const token = makeToken({ role: 'nurse' });

      const res = await request(app, 'GET', '/api/logs', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(403);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app, 'GET', '/api/logs');
      expect(res.status).toBe(401);
    });
  });
});
