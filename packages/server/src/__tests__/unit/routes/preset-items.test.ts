/**
 * Unit tests for src/routes/preset-items.ts
 * Tests preset item management endpoints with mocked Prisma
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { mockPrismaInstance, resetMockPrisma } from '../../helpers/mockPrisma';
import { mockPresetItemNurseOnly, mockPresetItemSelf } from '../../helpers/fixtures';

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
import presetItemsRouter from '../../../routes/preset-items';

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/preset-items', presetItemsRouter);
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

// Helper to generate tokens
function getAdminToken() {
  return jwt.sign(
    { userId: 'admin-1', username: 'admin', role: 'admin', name: '管理员' },
    process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing',
    { expiresIn: '1h' }
  );
}

function getNurseToken() {
  return jwt.sign(
    { userId: 'user-1', username: 'nurse01', role: 'nurse', name: '张护士' },
    process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing',
    { expiresIn: '1h' }
  );
}

describe('Preset Items Routes', () => {
  let app: express.Application;
  let adminToken: string;
  let nurseToken: string;

  beforeEach(() => {
    resetMockPrisma();
    app = createTestApp();
    adminToken = getAdminToken();
    nurseToken = getNurseToken();
  });

  describe('GET /api/preset-items', () => {
    it('should return list of active preset items', async () => {
      const p = mockPrismaInstance as any;
      p.presetItem.findMany.mockResolvedValue([mockPresetItemSelf, mockPresetItemNurseOnly]);

      const res = await request(app, 'GET', '/api/preset-items', {
        headers: { authorization: `Bearer ${nurseToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('should filter by type', async () => {
      const p = mockPrismaInstance as any;
      p.presetItem.findMany.mockResolvedValue([mockPresetItemSelf]);

      const res = await request(app, 'GET', '/api/preset-items?type=intake', {
        headers: { authorization: `Bearer ${nurseToken}` },
      });

      expect(res.status).toBe(200);
      expect(p.presetItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'intake', isActive: true }),
        })
      );
    });

    it('should filter by permission', async () => {
      const p = mockPrismaInstance as any;
      p.presetItem.findMany.mockResolvedValue([mockPresetItemSelf]);

      const res = await request(app, 'GET', '/api/preset-items?permission=self', {
        headers: { authorization: `Bearer ${nurseToken}` },
      });

      expect(res.status).toBe(200);
      expect(p.presetItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ permission: 'self', isActive: true }),
        })
      );
    });

    it('should include inactive items when requested', async () => {
      const p = mockPrismaInstance as any;
      p.presetItem.findMany.mockResolvedValue([mockPresetItemSelf, mockPresetItemNurseOnly]);

      const res = await request(app, 'GET', '/api/preset-items?includeInactive=true', {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      expect(p.presetItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app, 'GET', '/api/preset-items');

      expect(res.status).toBe(401);
    });

    it('should allow patient-side query for self preset items without jwt', async () => {
      const p = mockPrismaInstance as any;
      p.presetItem.findMany.mockResolvedValue([mockPresetItemSelf]);

      const res = await request(app, 'GET', '/api/preset-items?type=intake&permission=self', {
        headers: { authorization: 'Bearer bed-A001-device' },
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(p.presetItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'intake',
            permission: 'self',
            isActive: true,
          }),
        })
      );
    });
  });

  describe('POST /api/preset-items', () => {
    it('should create preset item successfully', async () => {
      const p = mockPrismaInstance as any;
      p.presetItem.findFirst.mockResolvedValue(null);
      p.presetItem.create.mockResolvedValue({
        id: 'preset-new',
        name: '鼻饲',
        type: 'intake',
        unit: 'ml',
        permission: 'nurse_only',
        isActive: true,
        sortOrder: 3,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      p.operationLog.create.mockResolvedValue({});

      const res = await request(app, 'POST', '/api/preset-items', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: {
          name: '鼻饲',
          type: 'intake',
          unit: 'ml',
          permission: 'nurse_only',
        },
      });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Preset item created successfully');
      expect(res.body.data.name).toBe('鼻饲');
    });

    it('should return 400 when item already exists', async () => {
      const p = mockPrismaInstance as any;
      p.presetItem.findFirst.mockResolvedValue(mockPresetItemSelf);

      const res = await request(app, 'POST', '/api/preset-items', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: {
          name: '口服液体',
          type: 'intake',
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Preset item already exists');
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app, 'POST', '/api/preset-items', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: { name: '鼻饲' }, // missing type
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid type', async () => {
      const res = await request(app, 'POST', '/api/preset-items', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: {
          name: '鼻饲',
          type: 'invalid', // should be 'intake' or 'output'
        },
      });

      expect(res.status).toBe(400);
    });

    it('should return 403 for non-admin user', async () => {
      const res = await request(app, 'POST', '/api/preset-items', {
        headers: { authorization: `Bearer ${nurseToken}` },
        body: {
          name: '鼻饲',
          type: 'intake',
        },
      });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/preset-items/:id', () => {
    it('should update preset item successfully', async () => {
      const p = mockPrismaInstance as any;
      p.presetItem.findUnique.mockResolvedValue(mockPresetItemSelf);
      p.presetItem.findFirst.mockResolvedValue(null);
      p.presetItem.update.mockResolvedValue({
        ...mockPresetItemSelf,
        name: '口服液体（更新）',
      });
      p.operationLog.create.mockResolvedValue({});

      const res = await request(app, 'PUT', '/api/preset-items/preset-2', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: { name: '口服液体（更新）' },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Preset item updated successfully');
    });

    it('should return 404 when item not found', async () => {
      const p = mockPrismaInstance as any;
      p.presetItem.findUnique.mockResolvedValue(null);

      const res = await request(app, 'PUT', '/api/preset-items/nonexistent', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: { name: '新名称' },
      });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Preset item not found');
    });

    it('should return 400 when name and type conflict', async () => {
      const p = mockPrismaInstance as any;
      p.presetItem.findUnique.mockResolvedValue(mockPresetItemSelf);
      p.presetItem.findFirst.mockResolvedValue({ id: 'preset-3', name: '静脉输液', type: 'intake' });

      const res = await request(app, 'PUT', '/api/preset-items/preset-2', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: { name: '静脉输液' },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Preset item with this name and type already exists');
    });
  });

  describe('PUT /api/preset-items/:id/toggle', () => {
    it('should toggle item from active to inactive', async () => {
      const p = mockPrismaInstance as any;
      p.presetItem.findUnique.mockResolvedValue(mockPresetItemSelf); // isActive: true
      p.presetItem.update.mockResolvedValue({
        ...mockPresetItemSelf,
        isActive: false,
      });
      p.operationLog.create.mockResolvedValue({});

      const res = await request(app, 'PUT', '/api/preset-items/preset-2/toggle', {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
      expect(res.body.message).toContain('disabled');
    });

    it('should toggle item from inactive to active', async () => {
      const p = mockPrismaInstance as any;
      p.presetItem.findUnique.mockResolvedValue({
        ...mockPresetItemSelf,
        isActive: false,
      });
      p.presetItem.update.mockResolvedValue({
        ...mockPresetItemSelf,
        isActive: true,
      });
      p.operationLog.create.mockResolvedValue({});

      const res = await request(app, 'PUT', '/api/preset-items/preset-2/toggle', {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(true);
      expect(res.body.message).toContain('enabled');
    });

    it('should return 404 when item not found', async () => {
      const p = mockPrismaInstance as any;
      p.presetItem.findUnique.mockResolvedValue(null);

      const res = await request(app, 'PUT', '/api/preset-items/nonexistent/toggle', {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/preset-items/:id', () => {
    it('should delete non-system item successfully', async () => {
      const p = mockPrismaInstance as any;
      p.presetItem.findUnique.mockResolvedValue({
        ...mockPresetItemSelf,
        isSystem: false,
      });
      p.presetItem.delete.mockResolvedValue({});
      p.operationLog.create.mockResolvedValue({});

      const res = await request(app, 'DELETE', '/api/preset-items/preset-2', {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Preset item deleted successfully');
    });

    it('should return 400 when trying to delete system item', async () => {
      const p = mockPrismaInstance as any;
      p.presetItem.findUnique.mockResolvedValue(mockPresetItemNurseOnly); // isSystem: true

      const res = await request(app, 'DELETE', '/api/preset-items/preset-1', {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Cannot delete system preset item');
    });

    it('should return 404 when item not found', async () => {
      const p = mockPrismaInstance as any;
      p.presetItem.findUnique.mockResolvedValue(null);

      const res = await request(app, 'DELETE', '/api/preset-items/nonexistent', {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(404);
    });

    it('should return 403 for non-admin user', async () => {
      const res = await request(app, 'DELETE', '/api/preset-items/preset-2', {
        headers: { authorization: `Bearer ${nurseToken}` },
      });

      expect(res.status).toBe(403);
    });
  });
});
