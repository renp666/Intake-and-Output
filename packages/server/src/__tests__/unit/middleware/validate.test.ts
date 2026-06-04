/**
 * Unit tests for src/middleware/validate.ts
 * Tests the Zod validation middleware factory
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { validate } from '../../../middleware/validate';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../helpers/mockExpress';

describe('validate middleware', () => {
  let res: any;
  let next: any;

  beforeEach(() => {
    res = createMockResponse();
    next = createMockNext();
  });

  describe('body validation', () => {
    const bodySchema = z.object({
      name: z.string().min(1, 'Name is required'),
      amount: z.number().min(0, 'Amount must be positive'),
    });

    it('should pass validation and replace body with parsed data when valid', () => {
      const req = createMockRequest({ body: { name: 'test', amount: 100 } });
      const middleware = validate(bodySchema, 'body');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({ name: 'test', amount: 100 });
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 with error details when body is invalid', () => {
      const req = createMockRequest({ body: { name: '', amount: -5 } });
      const middleware = validate(bodySchema, 'body');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 400,
          data: null,
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 when required field is missing', () => {
      const req = createMockRequest({ body: { amount: 100 } }); // missing 'name'
      const middleware = validate(bodySchema, 'body');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should strip unknown fields with strict schemas', () => {
      const strictSchema = z.object({
        name: z.string(),
      }).strict();

      const req = createMockRequest({ body: { name: 'test', unknown: true } });
      const middleware = validate(strictSchema, 'body');

      middleware(req, res, next);

      // Zod strict() will throw on unknown keys
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should apply default values', () => {
      const schemaWithDefaults = z.object({
        name: z.string(),
        unit: z.string().default('ml'),
      });

      const req = createMockRequest({ body: { name: 'test' } });
      const middleware = validate(schemaWithDefaults, 'body');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.unit).toBe('ml');
    });
  });

  describe('query validation', () => {
    const querySchema = z.object({
      page: z.string().transform(Number).pipe(z.number().min(1)),
      search: z.string().optional(),
    });

    it('should validate query parameters', () => {
      const req = createMockRequest({ query: { page: '1', search: 'test' } });
      const middleware = validate(querySchema, 'query');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 400 when query params are invalid', () => {
      const req = createMockRequest({ query: { page: '0' } });
      const middleware = validate(querySchema, 'query');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('params validation', () => {
    const paramsSchema = z.object({
      id: z.string().min(1, 'ID is required'),
    });

    it('should validate route params', () => {
      const req = createMockRequest({ params: { id: 'valid-id' } });
      const middleware = validate(paramsSchema, 'params');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 400 when params are invalid', () => {
      const req = createMockRequest({ params: { id: '' } });
      const middleware = validate(paramsSchema, 'params');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('error message formatting', () => {
    it('should join multiple validation errors with semicolons', () => {
      const schema = z.object({
        name: z.string().min(1, 'Name required'),
        age: z.number().min(0, 'Age must be positive'),
      });

      const req = createMockRequest({ body: { name: '', age: -1 } });
      const middleware = validate(schema, 'body');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      const callArgs = (res.json as any).mock.calls[0][0];
      expect(callArgs.message).toContain('Name required');
      expect(callArgs.message).toContain('Age must be positive');
    });
  });

  describe('default target', () => {
    it('should default to body validation when target is not specified', () => {
      const schema = z.object({ name: z.string() });
      const req = createMockRequest({ body: { name: 'test' } });
      const middleware = validate(schema); // no target specified

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
