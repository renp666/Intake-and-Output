/**
 * Unit tests for src/lib/response.ts
 * Tests the standard API response formatting utilities
 */

import { describe, it, expect } from 'vitest';
import { success, error, paginated } from '../../../lib/response';

describe('response utility', () => {
  describe('success()', () => {
    it('should return correct format with default message', () => {
      const data = { id: '1', name: 'test' };
      const result = success(data);

      expect(result).toEqual({
        code: 200,
        message: 'Success',
        data: { id: '1', name: 'test' },
      });
    });

    it('should return correct format with custom message', () => {
      const data = { token: 'abc123' };
      const result = success(data, 'Login successful');

      expect(result).toEqual({
        code: 200,
        message: 'Login successful',
        data: { token: 'abc123' },
      });
    });

    it('should handle null data', () => {
      const result = success(null, 'Deleted');

      expect(result).toEqual({
        code: 200,
        message: 'Deleted',
        data: null,
      });
    });

    it('should handle array data', () => {
      const data = [{ id: '1' }, { id: '2' }];
      const result = success(data);

      expect(result.code).toBe(200);
      expect(result.data).toHaveLength(2);
    });

    it('should handle primitive data types', () => {
      expect(success(42).data).toBe(42);
      expect(success('text').data).toBe('text');
      expect(success(true).data).toBe(true);
    });
  });

  describe('error()', () => {
    it('should return correct format with default code 500', () => {
      const result = error('Something went wrong');

      expect(result).toEqual({
        code: 500,
        message: 'Something went wrong',
        data: null,
      });
    });

    it('should return correct format with custom code', () => {
      const result = error('Not found', 404);

      expect(result).toEqual({
        code: 404,
        message: 'Not found',
        data: null,
      });
    });

    it('should return 400 error format', () => {
      const result = error('Invalid input', 400);

      expect(result).toEqual({
        code: 400,
        message: 'Invalid input',
        data: null,
      });
    });

    it('should return 401 error format', () => {
      const result = error('Unauthorized', 401);

      expect(result).toEqual({
        code: 401,
        message: 'Unauthorized',
        data: null,
      });
    });

    it('should return 403 error format', () => {
      const result = error('Forbidden', 403);

      expect(result).toEqual({
        code: 403,
        message: 'Forbidden',
        data: null,
      });
    });

    it('should always have null data', () => {
      const result = error('Any error', 500);
      expect(result.data).toBeNull();
    });
  });

  describe('paginated()', () => {
    it('should return correct paginated format with default message', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const result = paginated(items, 10, 1, 5);

      expect(result).toEqual({
        code: 200,
        message: 'Success',
        data: {
          items: [{ id: '1' }, { id: '2' }],
          total: 10,
          page: 1,
          pageSize: 5,
          totalPages: 2,
        },
      });
    });

    it('should calculate totalPages correctly for exact division', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const result = paginated(items, 10, 1, 5);
      expect(result.data!.totalPages).toBe(2);
    });

    it('should calculate totalPages correctly with remainder', () => {
      const items = [{ id: '1' }];
      const result = paginated(items, 11, 3, 5);
      expect(result.data!.totalPages).toBe(3);
    });

    it('should handle empty result set', () => {
      const result = paginated([], 0, 1, 20);

      expect(result).toEqual({
        code: 200,
        message: 'Success',
        data: {
          items: [],
          total: 0,
          page: 1,
          pageSize: 20,
          totalPages: 0,
        },
      });
    });

    it('should use custom message', () => {
      const result = paginated([], 0, 1, 10, 'Custom message');
      expect(result.message).toBe('Custom message');
    });

    it('should preserve page and pageSize in response', () => {
      const result = paginated([], 0, 3, 15);
      expect(result.data!.page).toBe(3);
      expect(result.data!.pageSize).toBe(15);
    });
  });
});
