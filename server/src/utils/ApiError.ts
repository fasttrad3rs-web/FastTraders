import type { ApiErrorDetail } from '../types/api';

/**
 * Operational (expected) error. Anything thrown as an ApiError is safe to
 * surface to the client; everything else is treated as a bug and masked with a
 * generic 500 by the global error handler.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errors: ApiErrorDetail[];
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    options: { errors?: ApiErrorDetail[]; isOperational?: boolean; cause?: unknown } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = options.errors ?? [];
    this.isOperational = options.isOperational ?? true;
    if (options.cause !== undefined) this.cause = options.cause;

    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message = 'Bad request', errors?: ApiErrorDetail[]): ApiError {
    return new ApiError(400, message, errors ? { errors } : {});
  }

  static unauthorized(message = 'You are not authenticated'): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You do not have permission to perform this action'): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message = 'Resource already exists'): ApiError {
    return new ApiError(409, message);
  }

  static unprocessable(message = 'Validation failed', errors?: ApiErrorDetail[]): ApiError {
    return new ApiError(422, message, errors ? { errors } : {});
  }

  static tooManyRequests(message = 'Too many requests, please slow down'): ApiError {
    return new ApiError(429, message);
  }

  static internal(message = 'Something went wrong', cause?: unknown): ApiError {
    return new ApiError(500, message, { isOperational: false, cause });
  }
}
