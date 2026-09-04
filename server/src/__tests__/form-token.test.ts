import request from 'supertest';
import { createApp } from '../app';
import {
  issueFormToken,
  verifyFormToken,
  MIN_FILL_MS,
  MAX_TOKEN_AGE_MS,
} from '../utils/form-token';
import { envelope } from './helpers/envelope';

/**
 * The time-to-submit guard.
 *
 * The property being tested is not "rejects fast submissions" — that is easy
 * and useless. It is that the timestamp cannot be chosen by the client, which
 * is what separates this from the naive version where the browser posts its
 * own `renderedAt` and a bot just lies.
 */

describe('form tokens are minted and verified server-side', () => {
  const now = Date.UTC(2026, 6, 29, 10, 0, 0);

  it('accepts a token that sat for longer than the minimum fill time', () => {
    const token = issueFormToken(now);
    const verdict = verifyFormToken(token, now + MIN_FILL_MS + 1);

    expect(verdict.ok).toBe(true);
  });

  it('rejects a submission faster than a person can read the form', () => {
    const token = issueFormToken(now);
    const verdict = verifyFormToken(token, now + MIN_FILL_MS - 1);

    expect(verdict).toEqual({ ok: false, reason: 'too_fast' });
  });

  it('rejects a token whose timestamp was edited', () => {
    /*
     * This is the whole point. A bot that wants to look slow will back-date
     * the timestamp — so take a real token, wind it back an hour, and keep the
     * original signature. Without the HMAC this would sail through.
     */
    const token = issueFormToken(now);
    const [, signature] = token.split('.');
    const backdated = `${now - 60 * 60 * 1000}.${signature}`;

    expect(verifyFormToken(backdated, now)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects a forged signature of the right length', () => {
    const token = issueFormToken(now);
    const [issuedAt, signature] = token.split('.');
    const forged = `${issuedAt}.${'a'.repeat(signature?.length ?? 64)}`;

    expect(verifyFormToken(forged, now + MIN_FILL_MS + 1)).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
  });

  it('expires a token that has been sitting around for hours', () => {
    const token = issueFormToken(now);

    expect(verifyFormToken(token, now + MAX_TOKEN_AGE_MS + 1)).toEqual({
      ok: false,
      reason: 'expired',
    });
  });

  it.each([undefined, null, '', 'nonsense', 'abc.def', '123', 42])(
    'rejects malformed input: %p',
    (input) => {
      const verdict = verifyFormToken(input, now);
      expect(verdict.ok).toBe(false);
    },
  );

  it('a token still verifies inside the window it was issued for', () => {
    // Guards against an off-by-one that would reject everybody at exactly 3s.
    const token = issueFormToken(now);
    expect(verifyFormToken(token, now + MIN_FILL_MS).ok).toBe(true);
  });
});

describe('GET /api/v1/form-token', () => {
  it('issues a token that the verifier accepts', async () => {
    const response = await request(createApp()).get('/api/v1/form-token');

    expect(response.status).toBe(200);

    const { data } = envelope<{ formToken: string }>(response);
    const issued = data.formToken;

    // Issued now, so it is legitimately "too fast" this instant — which is
    // itself proof the clock is real rather than client-supplied.
    expect(verifyFormToken(issued)).toEqual({ ok: false, reason: 'too_fast' });
    expect(verifyFormToken(issued, Date.now() + MIN_FILL_MS + 1).ok).toBe(true);
  });
});
