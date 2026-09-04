'use client';

import { useEffect, useRef } from 'react';
import { apiClient, unwrap } from '@/lib/api-client';

/**
 * Fetches the signed "when was this form rendered" token.
 *
 * The token is minted server-side precisely so the browser cannot influence it
 * (see `server/src/utils/form-token.ts`), which means it has to be fetched
 * rather than computed here.
 *
 * Two deliberate choices:
 *
 *   - **Fetched on mount, not on submit.** The whole point is to measure how
 *     long the form was open. Requesting it at submit time would make every
 *     submission look instantaneous and reject everybody.
 *   - **Failure is silent.** If the request fails the form still submits, just
 *     without a token, and the server treats an absent token as acceptable.
 *     A buyer on a flaky connection must never be blocked from reaching the
 *     shop by an anti-spam nicety.
 *
 * Returns a getter rather than state on purpose: reading it during submit
 * avoids a re-render on arrival, and the value is never displayed.
 */
export function useFormToken(): () => string | undefined {
  const token = useRef<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const data = unwrap(
          await apiClient.get<{ formToken: string }>('/form-token'),
        );
        if (!cancelled) token.current = data.formToken;
      } catch {
        // Deliberately ignored — see the note above.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return () => token.current;
}
