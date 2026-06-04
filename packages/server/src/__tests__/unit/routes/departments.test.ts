/**
 * Unit tests for src/routes/departments.ts
 * Tests department CRUD endpoints with mocked Prisma
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { mockPrismaInstance, resetMockPrisma } from '../../helpers/mockPrisma';
import { mockDepartment, mockAdminUser } from '../../helpers/fixtures';

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
import departmentsRouter from '../../../routes/departments';

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/departments', departmentsRouter);
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

// Helper to generate admin token
function getAdminToken() {
  return jwt.sign(
    { userId: 'admin-1', username: 'admin', role: 'admin', name: '管理员' },
    process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing',
    { expiresIn: '1h' }
  );
}

describe('Departments Routes', () => {
  let app: express.Application;
  let adminToken: string;

  beforeEach(() => {
    resetMockPrisma();
    app = createTestApp();
    adminToken = getAdminToken();
  });

  describe('GET /api/departments', () => {
    it('should return list of departments', async () => {
      const p = mockPrismaInstance as any;
      p.department.findMany.mockResolvedValue([
        { ...mockDepartment, _count: { users: 2, beds: 5 } },
      ]);

      const res = await request(app, 'GET', '/api/departments', {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('内科');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app, 'GET', '/api/departments');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/departments', () => {
    it('should create department successfully', async () => {
      const p = mockPrismaInstance as any;
      p.department.findFirst.mockResolvedValue(null);
      p.department.create.mockResolvedValue({
        id: 'dept-new',
        name: '外科',
        code: 'WAI',
        description: '外科病房',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      p.operationLog.create.mockResolvedValue({});

      const res = await request(app, 'POST', '/api/departments', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: { name: '外科', code: 'WAI', description: '外科病房' },
      });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Department created successfully');
      expect(res.body.data.name).toBe('外科');
    });

    it('should return 400 when department name exists', async () => {
      const p = mockPrismaInstance as any;
      p.department.findFirst.mockResolvedValue({ ...mockDepartment, name: '内科' });

      const res = await request(app, 'POST', '/api/departments', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: { name: '内科', code: 'NEI2' },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Department name already exists');
    });

    it('should return 400 when department code exists', async () => {
      const p = mockPrismaInstance as any;
      p.department.findFirst.mockResolvedValue({ ...mockDepartment, code: 'NEI' });

      const res = await request(app, 'POST', '/api/departments', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: { name: '内科二区', code: 'NEI' },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Department code already exists');
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app, 'POST', '/api/departments', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: { name: '外科' }, // missing code
      });

      expect(res.status).toBe(400);
    });

    it('should return 403 for non-admin user', async () => {
      const nurseToken = jwt.sign(
        { userId: 'user-1', username: 'nurse01', role: 'nurse', name: '张护士' },
        process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing',
        { expiresIn: '1h' }
      );

      const res = await request(app, 'POST', '/api/departments', {
        headers: { authorization: `Bearer ${nurseToken}` },
        body: { name: '外科', code: 'WAI' },
      });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/departments/:id', () => {
    it('should update department successfully', async () => {
      const p = mockPrismaInstance as any;
      p.department.findUnique.mockResolvedValue(mockDepartment);
      p.department.findFirst.mockResolvedValue(null);
      p.department.update.mockResolvedValue({
        ...mockDepartment,
        name: '内科一区',
      });
      p.operationLog.create.mockResolvedValue({});

      const res = await request(app, 'PUT', '/api/departments/dept-1', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: { name: '内科一区' },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Department updated successfully');
    });

    it('should return 404 when department not found', async () => {
      const p = mockPrismaInstance as any;
      p.department.findUnique.mockResolvedValue(null);

      const res = await request(app, 'PUT', '/api/departments/nonexistent', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: { name: '新名称' },
      });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Department not found');
    });

    it('should return 400 when new name conflicts', async () => {
      const p = mockPrismaInstance as any;
      p.department.findUnique.mockResolvedValue(mockDepartment);
      p.department.findFirst.mockResolvedValue({ id: 'dept-2', name: '外科' });

      const res = await request(app, 'PUT', '/api/departments/dept-1', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: { name: '外科' },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Department name already exists');
    });
  });

  describe('DELETE /api/departments/:id', () => {
    it('should delete department successfully', async () => {
      const p = mockPrismaInstance as any;
      p.department.findUnique.mockResolvedValue({
        ...mockDepartment,
        _count: { users: 0, beds: 0 },
      });
      p.department.delete.mockResolvedValue({});
      p.operationLog.create.mockResolvedValue({});

      const res = await request(app, 'DELETE', '/api/departments/dept-1', {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Department deleted successfully');
    });

    it('should return 404 when department not found', async () => {
      const p = mockPrismaInstance as any;
      p.department.findUnique.mockResolvedValue(null);

      const res = await request(app, 'DELETE', '/api/departments/nonexistent', {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(404);
    });

    it('should return 400 when department has users', async () => {
      const p = mockPrismaInstance as any;
      p.department.findUnique.mockResolvedValue({
        ...mockDepartment,
        _count: { users: 3, beds: 0 },
      });

      const res = await request(app, 'DELETE', '/api/departments/dept-1', {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Cannot delete department with assigned users');
    });

    it('should return 400 when department has beds', async () => {
      const p = mockPrismaInstance as any;
      p.department.findUnique.mockResolvedValue({
        ...mockDepartment,
        _count: { users: 0, beds: 5 },
      });

      const res = await request(app, 'DELETE', '/api/departments/dept-1', {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Cannot delete department with assigned beds');
    });
  });
});
