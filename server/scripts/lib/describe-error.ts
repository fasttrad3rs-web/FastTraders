/**
 * Turn an unknown thrown value into something a person can act on.
 *
 * `String(error)` is the obvious thing to write and it is wrong for most of
 * what this codebase actually throws. Cloudinary rejects with
 * `{ error: { message, http_code } }`, Mongoose validation with a nested
 * `errors` map, and `fetch` with a bare `TypeError` whose `cause` holds the
 * real reason — none of which are `Error` instances at the top level, so all of
 * them stringify to `[object Object]`.
 *
 * That is not a cosmetic problem. `npm run verify:cloudinary` reported exactly
 * that and hid the credential failure it exists to surface. This lives in one
 * place so no script has to remember.
 */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    // `fetch` wraps the useful part in `cause`: "fetch failed" alone is noise.
    const cause = (error as { cause?: unknown }).cause;
    if (cause && cause !== error) {
      const inner = describeError(cause);
      if (inner && inner !== error.message) return `${error.message} — ${inner}`;
    }
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const wrapped = (error as { error?: unknown }).error;
    if (wrapped && wrapped !== error) return describeError(wrapped);

    const record = error as {
      message?: unknown;
      http_code?: unknown;
      code?: unknown;
      name?: unknown;
    };

    const parts = [
      typeof record.message === 'string' ? record.message : '',
      typeof record.http_code === 'number' ? `HTTP ${record.http_code}` : '',
      typeof record.code === 'string' ? record.code : '',
      typeof record.name === 'string' ? record.name : '',
    ].filter(Boolean);

    if (parts.length > 0) return parts.join(' — ');

    try {
      return JSON.stringify(error);
    } catch {
      // Circular, or a BigInt somewhere. Say so rather than throwing again
      // from inside an error handler.
      return 'an error object that could not be serialised';
    }
  }

  return String(error);
}
