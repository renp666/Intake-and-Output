/**
 * Unit tests for src/routes/users.ts
 * Tests user management CRUD endpoints with mocked Prisma
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { mockPrismaInstance, resetMockPrisma } from '../../helpers/mockPrisma';
import { mockUser, mockAdminUser, mockDepartment } from '../../helpers/fixtures';

// Mock prisma module
vi.mock('../../../lib/prisma', () => ({
  prisma: mockPrismaInstance,
}));

// Mock the index module to prevent server startup and provide asyncHandler
vi.mock('../../../index', () => ({
  asyncHandler: (fn: any) => fn,
  default: {},
}));

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    genSalt: vi.fn().mockResolvedValue('salt'),
    hash: vi.fn().mockResolvedValue('hashedPassword'),
  },
}));

// Import AFTER mocks are set up
import usersRouter from '../../../routes/users';
import bcrypt from 'bcryptjs';

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/users', usersRouter);
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

describe('Users Routes', () => {
  let app: express.Application;
  let adminToken: string;

  beforeEach(() => {
    resetMockPrisma();
    app = createTestApp();
    adminToken = getAdminToken();
  });

  describe('GET /api/users', () => {
    it('should return paginated users list', async () => {
      const p = mockPrismaInstance as any;
      const users = [
        {
          id: 'user-1',
          username: 'nurse01',
          name: '张护士',
          role: 'nurse',
          departmentId: 'dept-1',
          isActive: true,
          lastLoginAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          department: { id: 'dept-1', name: '内科', code: 'NEI' },
        },
      ];
      p.user.findMany.mockResolvedValue(users);
      p.user.count.mockResolvedValue(1);

      const res = await request(app, 'GET', '/api/users', {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.page).toBe(1);
    });

    it('should filter by departmentId', async () => {
      const p = mockPrismaInstance as any;
      p.user.findMany.mockResolvedValue([]);
      p.user.count.mockResolvedValue(0);

      const res = await request(app, 'GET', '/api/users?departmentId=dept-1', {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      expect(p.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ departmentId: 'dept-1' }),
        })
      );
    });

    it('should filter by role', async () => {
      const p = mockPrismaInstance as any;
      p.user.findMany.mockResolvedValue([]);
      p.user.count.mockResolvedValue(0);

      const res = await request(app, 'GET', '/api/users?role=nurse', {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      expect(p.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'nurse' }),
        })
      );
    });

    it('should return 403 for non-admin user', async () => {
      const nurseToken = jwt.sign(
        { userId: 'user-1', username: 'nurse01', role: 'nurse', name: '张护士' },
        process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing',
        { expiresIn: '1h' }
      );

      const res = await request(app, 'GET', '/api/users', {
        headers: { authorization: `Bearer ${nurseToken}` },
      });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/users', () => {
    it('should create user successfully', async () => {
      const p = mockPrismaInstance as any;
      p.user.findUnique.mockResolvedValue(null);
      p.department.findUnique.mockResolvedValue(mockDepartment);
      p.user.create.mockResolvedValue({
        id: 'user-new',
        username: 'nurse02',
        name: '李护士',
        role: 'nurse',
        departmentId: 'dept-1',
        isActive: true,
        createdAt: new Date(),
        department: mockDepartment,
      });
      p.operationLog.create.mockResolvedValue({});

      const res = await request(app, 'POST', '/api/users', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: {
          username: 'nurse02',
          password: 'password123',
          name: '李护士',
          role: 'nurse',
          departmentId: 'dept-1',
        },
      });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('User created successfully');
      expect(res.body.data.username).toBe('nurse02');
      expect(bcrypt.hash).toHaveBeenCalled();
    });

    it('should return 400 when username exists', async () => {
      const p = mockPrismaInstance as any;
      p.user.findUnique.mockResolvedValue(mockUser);

      const res = await request(app, 'POST', '/api/users', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: {
          username: 'nurse01',
          password: 'password123',
          name: '张护士',
          role: 'nurse',
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Username already exists');
    });

    it('should return 400 when department not found', async () => {
      const p = mockPrismaInstance as any;
      p.user.findUnique.mockResolvedValue(null);
      p.department.findUnique.mockResolvedValue(null);

      const res = await request(app, 'POST', '/api/users', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: {
          username: 'nurse02',
          password: 'password123',
          name: '李护士',
          role: 'nurse',
          departmentId: 'nonexistent',
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Department not found');
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app, 'POST', '/api/users', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: { username: 'nurse02' }, // missing password, name
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 for short password', async () => {
      const res = await request(app, 'POST', '/api/users', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: {
          username: 'nurse02',
          password: '12345', // less than 6 chars
          name: '李护士',
        },
      });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user successfully', async () => {
      const p = mockPrismaInstance as any;
      p.user.findUnique.mockResolvedValue(mockUser);
      p.user.update.mockResolvedValue({
        ...mockUser,
        name: '张护士长',
      });
      p.operationLog.create.mockResolvedValue({});

      const res = await request(app, 'PUT', '/api/users/user-1', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: { name: '张护士长' },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('User updated successfully');
    });

    it('should return 404 when user not found', async () => {
      const p = mockPrismaInstance as any;
      p.user.findUnique.mockResolvedValue(null);

      const res = await request(app, 'PUT', '/api/users/nonexistent', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: { name: '新名称' },
      });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');
    });

    it('should return 400 when username conflicts', async () => {
      const p = mockPrismaInstance as any;
      p.user.findUnique.mockResolvedValue(mockUser);
      p.user.findUnique.mockResolvedValueOnce(mockUser);
      p.user.findUnique.mockResolvedValueOnce({ id: 'user-2', username: 'admin' });

      const res = await request(app, 'PUT', '/api/users/user-1', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: { username: 'admin' },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Username already exists');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user without records', async () => {
      const p = mockPrismaInstance as any;
      p.user.findUnique.mockResolvedValue({ ...mockUser, id: 'user-to-delete' });
      p.intakeOutputRecord.count.mockResolvedValue(0);
      p.user.delete.mockResolvedValue({});
      p.operationLog.create.mockResolvedValue({});

      const res = await request(app, 'DELETE', '/api/users/user-to-delete', {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('User deleted successfully');
    });

    it('should deactivate user with records', async () => {
      const p = mockPrismaInstance as any;
      p.user.findUnique.mockResolvedValue(mockUser);
      p.intakeOutputRecord.count.mockResolvedValue(10);
      p.user.update.mockResolvedValue({});

      const res = await request(app, 'DELETE', '/api/users/user-1', {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('User deactivated successfully (has existing records)');
    });

    it('should return 404 when user not found', async () => {
      const p = mockPrismaInstance as any;
      p.user.findUnique.mockResolvedValue(null);

      const res = await request(app, 'DELETE', '/api/users/nonexistent', {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(404);
    });

    it('should return 400 when trying to delete self', async () => {
      const p = mockPrismaInstance as any;
      p.user.findUnique.mockResolvedValue({ ...mockAdminUser, id: 'admin-1' });

      const res = await request(app, 'DELETE', '/api/users/admin-1', {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Cannot delete yourself');
    });
  });

  describe('POST /api/users/:id/reset-password', () => {
    it('should reset password successfully', async () => {
      const p = mockPrismaInstance as any;
      p.user.findUnique.mockResolvedValue(mockUser);
      p.user.update.mockResolvedValue({});
      p.operationLog.create.mockResolvedValue({});

      const res = await request(app, 'POST', '/api/users/user-1/reset-password', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: { newPassword: 'newpassword123' },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password reset successfully');
      expect(bcrypt.hash).toHaveBeenCalled();
    });

    it('should return 404 when user not found', async () => {
      const p = mockPrismaInstance as any;
      p.user.findUnique.mockResolvedValue(null);

      const res = await request(app, 'POST', '/api/users/nonexistent/reset-password', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: { newPassword: 'newpassword123' },
      });

      expect(res.status).toBe(404);
    });

    it('should return 400 for short password', async () => {
      const res = await request(app, 'POST', '/api/users/user-1/reset-password', {
        headers: { authorization: `Bearer ${adminToken}` },
        body: { newPassword: '12345' }, // less than 6 chars
      });

      expect(res.status).toBe(400);
    });
  });
});
