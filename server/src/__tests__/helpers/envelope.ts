import type { Response } from 'supertest';

/**
 * Typed access to a supertest response body.
 *
 * `Response['body']` is `any`, which turns every assertion in these suites
 * into an `@typescript-eslint/no-unsafe-member-access` error. Casting once,
 * here, keeps the `any` at the library boundary instead of scattering
 * `eslint-disable` comments through the tests — and it means a rename in the
 * response shape is a compile error in the test rather than a silent pass.
 */
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export function envelope<T = unknown>(response: Response): ApiEnvelope<T> {
  return response.body as ApiEnvelope<T>;
}
