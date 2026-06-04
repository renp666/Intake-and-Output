/**
 * Express Request/Response mock helpers
 * Provides factory functions to create mock Express objects for unit testing
 */

import { vi } from 'vitest';
import { Request, Response } from 'express';

/**
 * Create a mock Express Request object
 */
export function createMockRequest(overrides: Partial<Request> = {}): Request {
  const req: any = {
    body: {},
    query: {},
    params: {},
    headers: {},
    ip: '127.0.0.1',
    method: 'GET',
    path: '/',
    ...overrides,
  };
  return req as Request;
}

/**
 * Create a mock Express Response object with chainable methods
 */
export function createMockResponse(overrides: Partial<Response> = {}): Response {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    ...overrides,
  };
  return res as Response;
}

/**
 * Create a mock NextFunction
 */
export function createMockNext() {
  return vi.fn();
}

/**
 * Helper to generate a valid JWT token for testing
 */
export function generateTestToken(payload: {
  userId?: string;
  username?: string;
  role?: string;
  name?: string;
  departmentId?: string;
} = {}): string {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    {
      userId: payload.userId || 'test-user-id',
      username: payload.username || 'testuser',
      role: payload.role || 'nurse',
      name: payload.name || 'Test User',
      departmentId: payload.departmentId || 'test-dept-id',
    },
    process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing',
    { expiresIn: '1h' }
  );
}

/**
 * Generate an expired JWT token for testing
 */
export function generateExpiredToken(): string {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    {
      userId: 'test-user-id',
      username: 'testuser',
      role: 'nurse',
      name: 'Test User',
    },
    process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing',
    { expiresIn: '0s' }
  );
}
