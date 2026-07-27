import type { ApiErrorDetail } from '@/types/api';

/**
 * Error thrown by the API client for any non-successful response,
 * network failure or timeout. Carries enough context for UI error states.
 */
export class ApiClientError extends Error {
  public readonly status: number;
  public readonly errors: ApiErrorDetail[];
  public readonly isNetworkError: boolean;

  constructor(
    message: string,
    options: { status?: number; errors?: ApiErrorDetail[]; isNetworkError?: boolean } = {},
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = options.status ?? 0;
    this.errors = options.errors ?? [];
    this.isNetworkError = options.isNetworkError ?? false;

    // Restore prototype chain (required when targeting ES5-compatible output).
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }

  /** Field-keyed map, convenient for hydrating React Hook Form errors. */
  get fieldErrors(): Record<string, string> {
    return this.errors.reduce<Record<string, string>>((acc, item) => {
      if (item.field) acc[item.field] = item.message;
      return acc;
    }, {});
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isValidationError(): boolean {
    return this.status === 422 || this.status === 400;
  }
}

/** Narrow an unknown thrown value to an ApiClientError. */
export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}
