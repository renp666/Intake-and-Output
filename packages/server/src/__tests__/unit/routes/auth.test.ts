/**
 * Unit tests for src/routes/auth.ts
 * Tests authentication endpoints with mocked Prisma and bcrypt
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { mockPrismaInstance, resetMockPrisma } from '../../helpers/mockPrisma';
import {
  mockUser,
  mockAdminUser,
  mockDisabledUser,
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

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    genSalt: vi.fn().mockResolvedValue('salt'),
    hash: vi.fn().mockResolvedValue('hashedPassword'),
  },
}));

// Import AFTER mocks are set up
import authRouter from '../../../routes/auth';
import bcrypt from 'bcryptjs';

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
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

describe('Auth Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    resetMockPrisma();
    app = createTestApp();
  });

  describe('POST /api/auth/login', () => {
    it('should return token with valid credentials', async () => {
      const p = mockPrismaInstance as any;
      const userWithDept = { ...mockUser, department: { id: 'dept-1', name: '内科', code: 'NEI' } };
      p.user.findUnique.mockResolvedValue(userWithDept);
      p.user.update.mockResolvedValue({});
      p.operationLog.create.mockResolvedValue({});
      (bcrypt.compare as any).mockResolvedValue(true);

      const res = await request(app, 'POST', '/api/auth/login', {
        body: { username: 'nurse01', password: 'password123' },
      });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.username).toBe('nurse01');
      expect(res.body.data.user.role).toBe('nurse');

      // Verify token is valid
      const decoded = jwt.verify(
        res.body.data.token,
        process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing'
      );
      expect((decoded as any).userId).toBe(mockUser.id);
    });

    it('should return 401 with invalid credentials', async () => {
      const p = mockPrismaInstance as any;
      p.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      const res = await request(app, 'POST', '/api/auth/login', {
        body: { username: 'nurse01', password: 'wrongpassword' },
      });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
      expect(res.body.message).toBe('Invalid username or password');
    });

    it('should return 401 when user does not exist', async () => {
      const p = mockPrismaInstance as any;
      p.user.findUnique.mockResolvedValue(null);

      const res = await request(app, 'POST', '/api/auth/login', {
        body: { username: 'nonexistent', password: 'password' },
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid username or password');
    });

    it('should return 403 for disabled account', async () => {
      const p = mockPrismaInstance as any;
      p.user.findUnique.mockResolvedValue(mockDisabledUser);

      const res = await request(app, 'POST', '/api/auth/login', {
        body: { username: 'disabled_user', password: 'password123' },
      });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe(403);
      expect(res.body.message).toBe('Account is disabled');
    });

    it('should return 400 for missing username', async () => {
      const res = await request(app, 'POST', '/api/auth/login', {
        body: { password: 'password123' },
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing password', async () => {
      const res = await request(app, 'POST', '/api/auth/login', {
        body: { username: 'nurse01' },
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user info with valid token', async () => {
      const p = mockPrismaInstance as any;
      const token = jwt.sign(
        { userId: 'user-1', username: 'nurse01', role: 'nurse', name: 'Zhang' },
        process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing',
        { expiresIn: '1h' }
      );

      p.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'nurse01',
        name: '张护士',
        role: 'nurse',
        departmentId: 'dept-1',
        isActive: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        department: { id: 'dept-1', name: '内科', code: 'NEI' },
      });

      const res = await request(app, 'GET', '/api/auth/me', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.username).toBe('nurse01');
      expect(res.body.data.name).toBe('张护士');
    });

    it('should return 401 without token', async () => {
      const res = await request(app, 'GET', '/api/auth/me');

      expect(res.status).toBe(401);
    });

    it('should return 404 when user not found in database', async () => {
      const p = mockPrismaInstance as any;
      const token = jwt.sign(
        { userId: 'deleted-user', username: 'deleted', role: 'nurse', name: 'Deleted' },
        process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing',
        { expiresIn: '1h' }
      );

      p.user.findUnique.mockResolvedValue(null);

      const res = await request(app, 'GET', '/api/auth/me', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/auth/password', () => {
    it('should change password successfully', async () => {
      const p = mockPrismaInstance as any;
      const token = jwt.sign(
        { userId: 'user-1', username: 'nurse01', role: 'nurse', name: 'Zhang' },
        process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing',
        { expiresIn: '1h' }
      );

      p.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      p.user.update.mockResolvedValue({});
      p.operationLog.create.mockResolvedValue({});

      const res = await request(app, 'PUT', '/api/auth/password', {
        headers: { authorization: `Bearer ${token}` },
        body: { oldPassword: 'password123', newPassword: 'newpassword123' },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password changed successfully');
    });

    it('should return 400 with wrong old password', async () => {
      const p = mockPrismaInstance as any;
      const token = jwt.sign(
        { userId: 'user-1', username: 'nurse01', role: 'nurse', name: 'Zhang' },
        process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing',
        { expiresIn: '1h' }
      );

      p.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      const res = await request(app, 'PUT', '/api/auth/password', {
        headers: { authorization: `Bearer ${token}` },
        body: { oldPassword: 'wrongoldpassword', newPassword: 'newpassword123' },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Old password is incorrect');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app, 'PUT', '/api/auth/password', {
        body: { oldPassword: 'old', newPassword: 'newpassword123' },
      });

      expect(res.status).toBe(401);
    });

    it('should return 400 when new password is too short', async () => {
      const p = mockPrismaInstance as any;
      const token = jwt.sign(
        { userId: 'user-1', username: 'nurse01', role: 'nurse', name: 'Zhang' },
        process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing',
        { expiresIn: '1h' }
      );

      const res = await request(app, 'PUT', '/api/auth/password', {
        headers: { authorization: `Bearer ${token}` },
        body: { oldPassword: 'password123', newPassword: '12345' }, // less than 6 chars
      });

      expect(res.status).toBe(400);
    });

    it('should return 404 when user not found', async () => {
      const p = mockPrismaInstance as any;
      const token = jwt.sign(
        { userId: 'user-1', username: 'nurse01', role: 'nurse', name: 'Zhang' },
        process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing',
        { expiresIn: '1h' }
      );

      p.user.findUnique.mockResolvedValue(null);

      const res = await request(app, 'PUT', '/api/auth/password', {
        headers: { authorization: `Bearer ${token}` },
        body: { oldPassword: 'password123', newPassword: 'newpassword123' },
      });

      expect(res.status).toBe(404);
    });
  });
});
