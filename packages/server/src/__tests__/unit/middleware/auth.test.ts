/**
 * Unit tests for src/middleware/auth.ts
 * Tests JWT authentication and role-based authorization middleware
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { auth, adminOnly, nurseOrAdmin } from '../../../middleware/auth';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
  generateTestToken,
  generateExpiredToken,
} from '../../helpers/mockExpress';

describe('auth middleware', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    res = createMockResponse();
    next = createMockNext();
  });

  describe('auth()', () => {
    it('should set user on request when valid token is provided', () => {
      const token = generateTestToken({
        userId: 'u1',
        username: 'nurse01',
        role: 'nurse',
        name: 'Zhang',
        departmentId: 'd1',
      });
      req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });

      auth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user!.userId).toBe('u1');
      expect(req.user!.username).toBe('nurse01');
      expect(req.user!.role).toBe('nurse');
      expect(req.user!.name).toBe('Zhang');
      expect(req.user!.departmentId).toBe('d1');
    });

    it('should return 401 when no authorization header is provided', () => {
      req = createMockRequest({ headers: {} });

      auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 401,
          message: 'No authorization header provided',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header has invalid format', () => {
      req = createMockRequest({
        headers: { authorization: 'InvalidFormat' },
      });

      auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 401,
          message: 'Invalid authorization header format',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header lacks Bearer prefix', () => {
      req = createMockRequest({
        headers: { authorization: 'Token abc123' },
      });

      auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', () => {
      req = createMockRequest({
        headers: { authorization: 'Bearer invalid.token.here' },
      });

      auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 401,
          message: 'Invalid token',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', () => {
      // Small delay to ensure the token is expired
      vi.useFakeTimers();
      const token = generateExpiredToken();
      vi.useRealTimers();

      req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });

      auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle token with extra spaces in Bearer prefix', () => {
      req = createMockRequest({
        headers: { authorization: 'Bearer  abc123' }, // double space
      });

      auth(req, res, next);

      // Should fail: parts.length would be 3, not 2
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('adminOnly()', () => {
    it('should allow admin users', () => {
      req = createMockRequest();
      req.user = { userId: 'u1', username: 'admin', role: 'admin', name: 'Admin' };

      adminOnly(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject non-admin users with 403', () => {
      req = createMockRequest();
      req.user = { userId: 'u1', username: 'nurse', role: 'nurse', name: 'Nurse' };

      adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 403,
          message: 'Admin access required',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not set on request', () => {
      req = createMockRequest();
      // req.user is undefined

      adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 401,
          message: 'Authentication required',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject patient role', () => {
      req = createMockRequest();
      req.user = { userId: 'u1', username: 'patient', role: 'patient', name: 'Patient' };

      adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('nurseOrAdmin()', () => {
    it('should allow nurse users', () => {
      req = createMockRequest();
      req.user = { userId: 'u1', username: 'nurse', role: 'nurse', name: 'Nurse' };

      nurseOrAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow admin users', () => {
      req = createMockRequest();
      req.user = { userId: 'u1', username: 'admin', role: 'admin', name: 'Admin' };

      nurseOrAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject patient role with 403', () => {
      req = createMockRequest();
      req.user = { userId: 'u1', username: 'patient', role: 'patient', name: 'Patient' };

      nurseOrAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 403,
          message: 'Nurse or admin access required',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not set on request', () => {
      req = createMockRequest();

      nurseOrAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 401,
          message: 'Authentication required',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject unknown roles', () => {
      req = createMockRequest();
      req.user = { userId: 'u1', username: 'guest', role: 'guest', name: 'Guest' };

      nurseOrAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
