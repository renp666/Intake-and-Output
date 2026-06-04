/**
 * Unit tests for src/routes/beds.ts
 * Tests bed management endpoints with mocked Prisma
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { mockPrismaInstance, resetMockPrisma } from '../../helpers/mockPrisma';
import {
  mockBed,
  mockEmptyBed,
  mockPatient,
  mockDepartment,
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

// Mock qrcode module
vi.mock('qrcode', () => ({
  default: {
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('fake-qrcode')),
  },
}));

import bedsRouter from '../../../routes/beds';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/beds', bedsRouter);
  return app;
}

function makeToken(userId = 'admin-1', role = 'admin') {
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

async function requestRaw(app: express.Application, method: string, path: string, options: {
  body?: any;
  headers?: Record<string, string>;
} = {}) {
  return new Promise<{ status: number; text: string; headers: Record<string, string> }>((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = (server.address() as any).port;
      const url = `http://localhost:${port}${path}`;
      const fetchOptions: any = {
        method: method.toUpperCase(),
        headers: { 'Content-Type': 'application/json', ...options.headers },
      };
      if (options.body && method.toUpperCase() !== 'GET') {
        fetchOptions.body = JSON.stringify(options.body);
      }
      fetch(url, fetchOptions)
        .then(async (res) => {
          const text = await res.text();
          const headers: Record<string, string> = {};
          res.headers.forEach((value, key) => {
            headers[key] = value;
          });
          server.close();
          resolve({ status: res.status, text, headers });
        })
        .catch((err) => { server.close(); reject(err); });
    });
  });
}

describe('Beds Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    resetMockPrisma();
    app = createTestApp();
  });

  describe('POST /api/beds', () => {
    it('should create a new bed', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.bed.findUnique.mockResolvedValue(null); // no duplicate
      p.department.findUnique.mockResolvedValue(mockDepartment);
      p.bed.create.mockResolvedValue({ ...mockBed, department: mockDepartment });

      const res = await request(app, 'POST', '/api/beds', {
        headers: { authorization: `Bearer ${token}` },
        body: { bedNumber: 'A001', departmentId: 'dept-1' },
      });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Bed created successfully');
    });

    it('should reject duplicate bed number', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.bed.findUnique.mockResolvedValue(mockBed); // already exists

      const res = await request(app, 'POST', '/api/beds', {
        headers: { authorization: `Bearer ${token}` },
        body: { bedNumber: 'A001', departmentId: 'dept-1' },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Bed number already exists');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app, 'POST', '/api/beds', {
        body: { bedNumber: 'A001', departmentId: 'dept-1' },
      });
      expect(res.status).toBe(401);
    });

    it('should reject non-admin creating beds', async () => {
      const token = makeToken('user-1', 'nurse');
      const res = await request(app, 'POST', '/api/beds', {
        headers: { authorization: `Bearer ${token}` },
        body: { bedNumber: 'A001', departmentId: 'dept-1' },
      });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/beds/:id/bind', () => {
    it('should bind patient to bed', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.bed.findUnique.mockResolvedValue(mockEmptyBed);
      p.patient.findUnique.mockResolvedValue(mockPatient);
      p.bed.findFirst.mockResolvedValue(null); // patient not bound elsewhere
      p.bed.update.mockResolvedValue({
        ...mockBed,
        department: mockDepartment,
        patient: mockPatient,
      });
      p.patient.update.mockResolvedValue({});
      p.operationLog.create.mockResolvedValue({});

      const res = await request(app, 'POST', '/api/beds/bed-2/bind', {
        headers: { authorization: `Bearer ${token}` },
        body: { patientId: 'patient-1' },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Patient bound to bed successfully');
    });

    it('should reject binding to occupied bed', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.bed.findUnique.mockResolvedValue(mockBed); // bed already has patient

      const res = await request(app, 'POST', '/api/beds/bed-1/bind', {
        headers: { authorization: `Bearer ${token}` },
        body: { patientId: 'patient-2' },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Bed already has a patient bound');
    });

    it('should reject binding patient already in another bed', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.bed.findUnique.mockResolvedValue(mockEmptyBed);
      p.patient.findUnique.mockResolvedValue(mockPatient);
      p.bed.findFirst.mockResolvedValue(mockBed); // patient already bound

      const res = await request(app, 'POST', '/api/beds/bed-2/bind', {
        headers: { authorization: `Bearer ${token}` },
        body: { patientId: 'patient-1' },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Patient is already bound to another bed');
    });

    it('should return 404 for nonexistent bed', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.bed.findUnique.mockResolvedValue(null);

      const res = await request(app, 'POST', '/api/beds/nonexistent/bind', {
        headers: { authorization: `Bearer ${token}` },
        body: { patientId: 'patient-1' },
      });

      expect(res.status).toBe(404);
    });

    it('should return 404 for nonexistent patient', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.bed.findUnique.mockResolvedValue(mockEmptyBed);
      p.patient.findUnique.mockResolvedValue(null);

      const res = await request(app, 'POST', '/api/beds/bed-2/bind', {
        headers: { authorization: `Bearer ${token}` },
        body: { patientId: 'nonexistent' },
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/beds/:id/unbind', () => {
    it('should unbind patient from bed', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.bed.findUnique.mockResolvedValue({
        ...mockBed,
        patient: mockPatient,
      });
      p.bed.update.mockResolvedValue(mockEmptyBed);
      p.patient.update.mockResolvedValue({});
      p.operationLog.create.mockResolvedValue({});

      const res = await request(app, 'POST', '/api/beds/bed-1/unbind', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Patient unbound from bed successfully');
    });

    it('should reject unbinding from empty bed', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.bed.findUnique.mockResolvedValue(mockEmptyBed);

      const res = await request(app, 'POST', '/api/beds/bed-2/unbind', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Bed has no patient bound');
    });

    it('should return 404 for nonexistent bed', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.bed.findUnique.mockResolvedValue(null);

      const res = await request(app, 'POST', '/api/beds/nonexistent/unbind', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/beds/:id/qrcode', () => {
    it('should return patient verify url json for nurse qr display', async () => {
      const p = mockPrismaInstance as any;
      p.bed.findUnique.mockResolvedValue(mockBed);
      p.bed.update.mockResolvedValue({
        ...mockBed,
        qrcode: 'http://localhost:3001/verify?bed=A001',
      });

      const res = await requestRaw(app, 'GET', '/api/beds/bed-1/qrcode');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');

      const body = JSON.parse(res.text);
      expect(body.data.qrCode).toBe('http://localhost:3001/verify?bed=A001');
    });
  });
});
