import { User } from '../models';

/**
 * Saving a user loaded without its hidden fields must not throw.
 *
 * `refreshTokens` is `select: false`, so `User.findOne(...)` returns a document
 * where it is `undefined` rather than `[]`. The `trimRefreshTokens` pre-save
 * hook read `.length` off it unguarded, so **any** save of a partially selected
 * user died with `Cannot read properties of undefined (reading 'length')`.
 *
 * That is not a theoretical path. It is what `npm run create-admin` does when
 * resetting a password, which is the documented recovery procedure for a
 * locked-out admin — so the one command that unsticks a business owner from
 * his own production site was broken.
 *
 * These run the hook directly rather than against a database: the bug was in
 * the hook's assumption about its own document, and that is reproducible
 * without a connection.
 */

type Hook = (this: unknown, next: (error?: Error) => void) => void;

/** The registered `trimRefreshTokens` pre-save hook. */
function trimHook(): Hook {
  const registered = (
    User.schema as unknown as {
      s: { hooks: { _pres: Map<string, { fn: Hook }[]> } };
    }
  ).s.hooks._pres.get('save');

  const found = registered?.find((entry) => entry.fn.name === 'trimRefreshTokens');
  if (!found) throw new Error('trimRefreshTokens hook is not registered');
  return found.fn;
}

function run(document: Record<string, unknown>): Error | undefined {
  let error: Error | undefined;
  trimHook().call(document, (err?: Error) => {
    error = err;
  });
  return error;
}

describe('trimRefreshTokens', () => {
  it('survives a document where refreshTokens was never selected', () => {
    // The exact shape `create-admin` used to load, and used to crash on.
    const document = { email: 'fasttrad3rs@gmail.com', refreshTokens: undefined };

    expect(() => run(document)).not.toThrow();
  });

  it('leaves an unselected field alone rather than inventing an empty array', () => {
    // Writing `[]` here would look harmless and would silently sign every
    // device out on the next save.
    const document: Record<string, unknown> = { refreshTokens: undefined };

    run(document);

    expect(document.refreshTokens).toBeUndefined();
  });

  it('still trims a real list that has grown too long', () => {
    const document: Record<string, unknown> = {
      refreshTokens: Array.from({ length: 12 }, (_, index) => `token-${index}`),
    };

    run(document);

    const tokens = document.refreshTokens as string[];
    expect(tokens.length).toBeLessThan(12);
    // Newest kept, oldest dropped.
    expect(tokens).toContain('token-11');
    expect(tokens).not.toContain('token-0');
  });

  it('leaves a short list untouched', () => {
    const document: Record<string, unknown> = { refreshTokens: ['a', 'b'] };

    run(document);

    expect(document.refreshTokens).toEqual(['a', 'b']);
  });

  it('calls next exactly once, with no error', () => {
    const next = jest.fn();
    trimHook().call({ refreshTokens: undefined }, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
