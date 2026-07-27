import type { NextFunction, Request, Response } from 'express';
import { MongoServerError } from 'mongodb';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { isProduction } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';
import type { ApiErrorDetail, ApiErrorResponse } from '../types/api';

interface NormalisedError {
  statusCode: number;
  message: string;
  errors: ApiErrorDetail[];
  isOperational: boolean;
}

/** Translate known error shapes into a client-safe ApiError-like structure. */
function normalise(error: unknown): NormalisedError {
  if (error instanceof ApiError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      errors: error.errors,
      isOperational: error.isOperational,
    };
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 422,
      message: 'Validation failed',
      errors: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
      isOperational: true,
    };
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return {
      statusCode: 422,
      message: 'Validation failed',
      errors: Object.values(error.errors).map((item) => ({
        field: item.path,
        message: item.message,
      })),
      isOperational: true,
    };
  }

  if (error instanceof mongoose.Error.CastError) {
    return {
      statusCode: 400,
      message: `Invalid value for "${error.path}"`,
      errors: [{ field: error.path, message: 'Malformed identifier' }],
      isOperational: true,
    };
  }

  // Duplicate key.
  if (error instanceof MongoServerError && error.code === 11000) {
    const field = Object.keys((error.keyValue ?? {}) as Record<string, unknown>)[0] ?? 'field';
    return {
      statusCode: 409,
      message: `A record with that ${field} already exists`,
      errors: [{ field, message: 'Must be unique' }],
      isOperational: true,
    };
  }

  if (error instanceof Error && error.name === 'JsonWebTokenError') {
    return { statusCode: 401, message: 'Invalid token', errors: [], isOperational: true };
  }

  if (error instanceof Error && error.name === 'TokenExpiredError') {
    return { statusCode: 401, message: 'Session expired', errors: [], isOperational: true };
  }

  return {
    statusCode: 500,
    message: error instanceof Error ? error.message : 'Something went wrong',
    errors: [],
    isOperational: false,
  };
}

/**
 * Global error handler. Must be registered last and must keep all four
 * parameters — Express identifies error middleware by arity.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const { statusCode, message, errors, isOperational } = normalise(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const logPayload = {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    ip: req.ip,
  };

  if (statusCode >= 500 || !isOperational) {
    logger.error(`[error] ${message}`, { ...logPayload, stack });
  } else {
    logger.warn(`[error] ${message}`, logPayload);
  }

  // Never leak internals in production: unexpected errors become a generic 500.
  const clientMessage = isProduction && !isOperational ? 'Something went wrong' : message;

  const body: ApiErrorResponse = {
    success: false,
    message: clientMessage,
    data: null,
    ...(errors.length > 0 ? { errors } : {}),
    ...(isProduction ? {} : { stack }),
  };

  res.status(statusCode).json(body);
}
