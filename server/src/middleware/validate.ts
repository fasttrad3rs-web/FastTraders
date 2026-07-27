import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AnyZodObject, ZodTypeAny } from 'zod';

/**
 * Validate and *replace* request segments with their parsed (coerced, stripped)
 * values, so controllers receive fully typed, trusted input.
 *
 *   router.post('/', validate({ body: createProductSchema }), controller);
 *
 * ZodErrors bubble to the global error handler, which formats them as
 * field-level 422 responses.
 */
export interface ValidationSchemas {
  body?: AnyZodObject | ZodTypeAny;
  query?: AnyZodObject | ZodTypeAny;
  params?: AnyZodObject | ZodTypeAny;
}

export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) {
        const parsed: unknown = schemas.params.parse(req.params);
        req.params = parsed as typeof req.params;
      }
      if (schemas.query) {
        const parsed: unknown = schemas.query.parse(req.query);
        // `req.query` has only a getter in Express 5; assign via defineProperty.
        Object.defineProperty(req, 'query', { value: parsed, writable: true, configurable: true });
      }
      if (schemas.body) {
        const parsed: unknown = schemas.body.parse(req.body);
        req.body = parsed;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
