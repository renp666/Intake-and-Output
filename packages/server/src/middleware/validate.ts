import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { error } from '../lib/response';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Zod validation middleware factory
 * Validates request data against a schema
 */
export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = schema.parse(req[target]);
      // Replace with parsed/validated data
      (req as any)[target] = data;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const messages = err.errors.map((e) => e.message).join('; ');
        return res.status(400).json(error(messages, 400));
      }
      next(err);
    }
  };
}
