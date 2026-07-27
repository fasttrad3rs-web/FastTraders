import { env } from './env';
import { ApiClientError } from './api-error';
import type { ApiErrorDetail, ApiResponse, HttpMethod } from '@/types/api';

/**
 * Typed API client for the Fast Traders Express backend.
 *
 * - Base URL comes from `NEXT_PUBLIC_API_URL` (already includes `/api/v1`).
 * - `credentials: 'include'` so the httpOnly access/refresh cookies travel.
 * - A `401` triggers exactly one transparent `POST /auth/refresh`, then the
 *   original request is replayed. Concurrent 401s share a single refresh call.
 * - Every method resolves to the standard `ApiResponse<T>` envelope.
 */

const REFRESH_PATH = '/auth/refresh';
const DEFAULT_TIMEOUT_MS = 20_000;

export interface RequestConfig {
  /** Extra headers merged over the defaults. */
  headers?: Record<string, string>;
  /** Query string parameters; `undefined`/`null` entries are dropped. */
  params?: Record<string, string | number | boolean | undefined | null>;
  /** Abort the request after N milliseconds. Defaults to 20s. */
  timeoutMs?: number;
  /** Skip the automatic refresh-and-retry cycle (used by auth endpoints). */
  skipAuthRefresh?: boolean;
  /** Next.js fetch cache directives (server components / route handlers). */
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
  /** Caller-supplied abort signal. */
  signal?: AbortSignal;
}

/** Single-flight guard so parallel 401s trigger only one refresh round-trip. */
let refreshPromise: Promise<boolean> | null = null;

/** Emitted when the refresh token is dead; the auth store listens for this. */
export const AUTH_EXPIRED_EVENT = 'ft:auth-expired';

function notifyAuthExpired(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }
}

function buildUrl(path: string, params?: RequestConfig['params']): string {
  const url = new URL(`${env.NEXT_PUBLIC_API_URL}${path.startsWith('/') ? path : `/${path}`}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

/** Merge a caller signal with an internal timeout signal. */
function withTimeout(timeoutMs: number, external?: AbortSignal): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  return external ? AbortSignal.any([external, timeoutSignal]) : timeoutSignal;
}

async function parseBody<T>(response: Response): Promise<ApiResponse<T> | null> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    return null;
  }
}

/** Ask the server for a fresh access token using the refresh cookie. */
async function refreshSession(): Promise<boolean> {
  refreshPromise ??= (async (): Promise<boolean> => {
    try {
      const response = await fetch(buildUrl(REFRESH_PATH), {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
        signal: withTimeout(DEFAULT_TIMEOUT_MS),
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      // Release the guard on the next tick so queued callers reuse this result.
      setTimeout(() => {
        refreshPromise = null;
      }, 0);
    }
  })();

  return refreshPromise;
}

async function execute<T>(
  method: HttpMethod,
  path: string,
  body: unknown,
  config: RequestConfig,
  isRetry: boolean,
): Promise<ApiResponse<T>> {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(isFormData || body === undefined ? {} : { 'Content-Type': 'application/json' }),
    ...config.headers,
  };

  let response: Response;
  try {
    response = await fetch(buildUrl(path, config.params), {
      method,
      headers,
      credentials: 'include',
      body: isFormData ? body : body === undefined ? undefined : JSON.stringify(body),
      signal: withTimeout(config.timeoutMs ?? DEFAULT_TIMEOUT_MS, config.signal),
      ...(config.cache ? { cache: config.cache } : {}),
      ...(config.next ? { next: config.next } : {}),
    });
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === 'TimeoutError';
    throw new ApiClientError(
      aborted ? 'The request timed out. Please check your connection.' : 'Network error. Please try again.',
      { isNetworkError: true },
    );
  }

  // Transparent refresh-and-replay, once per request.
  if (response.status === 401 && !isRetry && !config.skipAuthRefresh && path !== REFRESH_PATH) {
    const refreshed = await refreshSession();
    if (refreshed) return execute<T>(method, path, body, config, true);
    notifyAuthExpired();
  }

  const payload = await parseBody<T>(response);

  if (!response.ok || payload?.success === false) {
    const errors = (payload as { errors?: ApiErrorDetail[] } | null)?.errors ?? [];
    throw new ApiClientError(payload?.message ?? `Request failed with status ${response.status}`, {
      status: response.status,
      errors,
    });
  }

  return payload ?? { success: true, message: 'OK', data: null };
}

function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  config: RequestConfig = {},
): Promise<ApiResponse<T>> {
  return execute<T>(method, path, body, config, false);
}

export const apiClient = {
  get: <T>(path: string, config?: RequestConfig): Promise<ApiResponse<T>> =>
    request<T>('GET', path, undefined, config),

  post: <T>(path: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> =>
    request<T>('POST', path, body, config),

  put: <T>(path: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> =>
    request<T>('PUT', path, body, config),

  patch: <T>(path: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> =>
    request<T>('PATCH', path, body, config),

  delete: <T>(path: string, config?: RequestConfig): Promise<ApiResponse<T>> =>
    request<T>('DELETE', path, undefined, config),
} as const;

/**
 * Unwrap an envelope to its payload, throwing when the server returned `null`.
 * Use for endpoints that are contractually guaranteed to return data.
 */
export function unwrap<T>(response: ApiResponse<T>): T {
  if (response.data === null) {
    throw new ApiClientError(response.message || 'The server returned an empty response.', {
      status: 500,
    });
  }
  return response.data;
}

export { ApiClientError, isApiClientError } from './api-error';
