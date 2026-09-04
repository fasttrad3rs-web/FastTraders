import { revalidate } from '../services/revalidate.service';
import { env } from '../config/env';

/** The one field these assertions read; typed so `String(body)` is honest. */
type SentInit = { method?: string; headers?: Record<string, string>; body?: string };

/**
 * Storefront cache invalidation.
 *
 * The property that matters is not "it sends a request" — it is that it
 * **cannot break an admin save**. A product update must succeed whether the
 * front end is up, down, redeploying or not configured at all. Everything here
 * asserts that failure mode.
 */

const mutable = env as unknown as { REVALIDATE_URL?: string; REVALIDATE_SECRET?: string };
const original = { url: mutable.REVALIDATE_URL, secret: mutable.REVALIDATE_SECRET };

describe('revalidate', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock;
    mutable.REVALIDATE_URL = 'https://example.invalid/api/revalidate';
    mutable.REVALIDATE_SECRET = 'a-secret-at-least-16-chars';
  });

  afterAll(() => {
    mutable.REVALIDATE_URL = original.url;
    mutable.REVALIDATE_SECRET = original.secret;
  });

  it('posts the tags with the shared secret', () => {
    revalidate(['products']);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, SentInit];

    expect(url).toBe('https://example.invalid/api/revalidate');
    expect(init.method).toBe('POST');
    expect(init.headers?.['x-revalidate-secret']).toBe(
      'a-secret-at-least-16-chars',
    );
    expect(JSON.parse(init.body ?? '{}')).toEqual({ tags: ['products'] });
  });

  it('does nothing when the feature is not configured', () => {
    // Running the API locally with no front end is normal, not an error.
    mutable.REVALIDATE_URL = undefined;

    revalidate(['products']);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does nothing when there are no tags', () => {
    revalidate([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never throws when the storefront is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    // Synchronous by design — the caller does not await it.
    expect(() => revalidate(['products'])).not.toThrow();

    // And the rejected promise is handled, not left unhandled.
    await new Promise((resolve) => setImmediate(resolve));
  });

  it('never throws when the storefront answers with an error status', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    expect(() => revalidate(['products'])).not.toThrow();
    await new Promise((resolve) => setImmediate(resolve));
  });

  it('sends a per-product tag alongside the collection tag', () => {
    revalidate(['products', 'product:terasaki-s250-nj-250a']);

    const [, init] = fetchMock.mock.calls[0] as [string, SentInit];
    expect(JSON.parse(init.body ?? '{}')).toEqual({
      tags: ['products', 'product:terasaki-s250-nj-250a'],
    });
  });
});
