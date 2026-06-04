/**
 * Unit tests for src/routes/patients.ts
 * Tests patient management endpoints with mocked Prisma
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { mockPrismaInstance, resetMockPrisma } from '../../helpers/mockPrisma';
import {
  mockPatient,
  mockDischargedPatient,
  mockBed,
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

import patientsRouter from '../../../routes/patients';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/patients', patientsRouter);
  return app;
}

function makeToken(userId = 'user-1', role = 'nurse', departmentId = 'dept-1') {
  return jwt.sign(
    { userId, username: 'testuser', role, name: 'Test', departmentId },
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

describe('Patients Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    resetMockPrisma();
    app = createTestApp();
  });

  describe('POST /api/patients', () => {
    it('should create a new patient', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken('admin-1', 'admin');
      p.patient.findUnique.mockResolvedValue(null); // no duplicate
      p.patient.create.mockResolvedValue(mockPatient);
      p.operationLog.create.mockResolvedValue({});

      const res = await request(app, 'POST', '/api/patients', {
        headers: { authorization: `Bearer ${token}` },
        body: {
          name: 'Li Si',
          hospitalNumber: 'H20250001',
          bedNumber: 'A001',
          weight: 70,
          height: 175,
        },
      });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Patient created successfully');
    });

    it('should reject duplicate hospital number', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken('admin-1', 'admin');
      p.patient.findUnique.mockResolvedValue(mockPatient); // already exists

      const res = await request(app, 'POST', '/api/patients', {
        headers: { authorization: `Bearer ${token}` },
        body: {
          name: 'Li Si',
          hospitalNumber: 'H20250001',
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Hospital number already exists');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app, 'POST', '/api/patients', {
        body: { name: 'test', hospitalNumber: 'H001' },
      });
      expect(res.status).toBe(401);
    });

    it('should reject non-nurse/non-admin creating patients', async () => {
      const token = makeToken('user-1', 'patient');
      const res = await request(app, 'POST', '/api/patients', {
        headers: { authorization: `Bearer ${token}` },
        body: { name: 'test', hospitalNumber: 'H001' },
      });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/patients', () => {
    it('should return patient list', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken('admin-1', 'admin');
      p.patient.findMany.mockResolvedValue([mockPatient]);
      p.patient.count.mockResolvedValue(1);

      const res = await request(app, 'GET', '/api/patients', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app, 'GET', '/api/patients');
      expect(res.status).toBe(401);
    });

    it('should filter by search query', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken('admin-1', 'admin');
      p.patient.findMany.mockResolvedValue([mockPatient]);
      p.patient.count.mockResolvedValue(1);

      const res = await request(app, 'GET', '/api/patients?search=Li', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/patients/:id', () => {
    it('should return single patient', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.patient.findUnique.mockResolvedValue({
        ...mockPatient,
        beds: [{ ...mockBed, department: mockDepartment }],
      });

      const res = await request(app, 'GET', '/api/patients/patient-1', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('patient-1');
    });

    it('should return 404 for nonexistent patient', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken();
      p.patient.findUnique.mockResolvedValue(null);

      const res = await request(app, 'GET', '/api/patients/nonexistent', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/patients/bed/:bedNumber', () => {
    it('should return active patient info by bed number for patient verification', async () => {
      const p = mockPrismaInstance as any;
      const patientOnBed = {
        ...mockPatient,
        beds: [{ ...mockBed, department: mockDepartment }],
      };
      p.patient.findFirst.mockResolvedValue(patientOnBed);

      const res = await request(app, 'GET', '/api/patients/bed/A001');

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        id: mockPatient.id,
        name: mockPatient.name,
        hospitalNumber: mockPatient.hospitalNumber,
        bedNumber: mockPatient.bedNumber,
      });
    });
  });

  describe('PUT /api/patients/:id', () => {
    it('should update patient', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken('admin-1', 'admin');
      const updatedPatient = { ...mockPatient, name: 'Updated Name' };
      p.patient.findUnique.mockResolvedValue(mockPatient);
      p.patient.update.mockResolvedValue(updatedPatient);
      p.operationLog.create.mockResolvedValue({});

      const res = await request(app, 'PUT', '/api/patients/patient-1', {
        headers: { authorization: `Bearer ${token}` },
        body: { name: 'Updated Name' },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Patient updated successfully');
    });

    it('should return 404 for nonexistent patient', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken('admin-1', 'admin');
      p.patient.findUnique.mockResolvedValue(null);

      const res = await request(app, 'PUT', '/api/patients/nonexistent', {
        headers: { authorization: `Bearer ${token}` },
        body: { name: 'Updated' },
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/patients/:id/discharge', () => {
    it('should discharge patient and unbind bed', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken('admin-1', 'admin');
      const discharged = { ...mockPatient, status: 'discharged', dischargeDate: new Date() };
      p.patient.findUnique.mockResolvedValue(mockPatient);
      p.patient.update.mockResolvedValue(discharged);
      p.bed.updateMany.mockResolvedValue({});
      p.operationLog.create.mockResolvedValue({});

      const res = await request(app, 'POST', '/api/patients/patient-1/discharge', {
        headers: { authorization: `Bearer ${token}` },
        body: { operator_name: 'Nurse Zhang' },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Patient discharged successfully');

      // Verify bed was unbound
      expect(p.bed.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientId: 'patient-1' },
          data: { patientId: null },
        })
      );
    });

    it('should reject discharging already discharged patient', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken('admin-1', 'admin');
      p.patient.findUnique.mockResolvedValue(mockDischargedPatient);

      const res = await request(app, 'POST', '/api/patients/patient-discharged/discharge', {
        headers: { authorization: `Bearer ${token}` },
        body: { operator_name: 'Nurse' },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Patient is already discharged');
    });

    it('should return 404 for nonexistent patient', async () => {
      const p = mockPrismaInstance as any;
      const token = makeToken('admin-1', 'admin');
      p.patient.findUnique.mockResolvedValue(null);

      const res = await request(app, 'POST', '/api/patients/nonexistent/discharge', {
        headers: { authorization: `Bearer ${token}` },
        body: { operator_name: 'Nurse' },
      });

      expect(res.status).toBe(404);
    });
  });
});
