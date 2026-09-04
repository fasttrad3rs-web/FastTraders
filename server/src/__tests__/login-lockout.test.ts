jest.mock('../models', () => ({
  User: { findOne: jest.fn() },
}));

import { User } from '../models';
import { authenticate, LOCKOUT_MS, MAX_FAILED_LOGINS } from '../services/auth.service';

/**
 * Per-account brute-force lockout.
 *
 * The IP limiter (5 per 15 minutes) covers one attacker on one connection.
 * This covers the distributed case, where every attempt arrives from a
 * different address and the IP limiter never fires once.
 */

interface FakeUser {
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  refreshTokens: string[];
  comparePassword: jest.Mock;
  save: jest.Mock;
}

function fakeUser(overrides: Partial<FakeUser> = {}): FakeUser {
  const user: FakeUser = {
    isActive: true,
    failedLoginAttempts: 0,
    refreshTokens: ['live-session'],
    comparePassword: jest.fn().mockResolvedValue(false),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return user;
}

function stubFindOne(user: FakeUser | null): void {
  (User.findOne as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
}

describe('brute-force lockout', () => {
  it('counts a failed attempt', async () => {
    const user = fakeUser();
    stubFindOne(user);

    await expect(authenticate('a@b.com', 'wrong')).rejects.toThrow(/Incorrect email or password/);

    expect(user.failedLoginAttempts).toBe(1);
    expect(user.lockedUntil).toBeUndefined();
    expect(user.save).toHaveBeenCalled();
  });

  it('locks the account on the tenth consecutive failure', async () => {
    const user = fakeUser({ failedLoginAttempts: MAX_FAILED_LOGINS - 1 });
    stubFindOne(user);

    await expect(authenticate('a@b.com', 'wrong')).rejects.toThrow();

    expect(user.failedLoginAttempts).toBe(MAX_FAILED_LOGINS);
    expect(user.lockedUntil).toBeInstanceOf(Date);
  });

  it('revokes live sessions when it locks', async () => {
    /*
     * If the password was guessed on an earlier attempt, a refresh token from
     * that session would otherwise outlive the lockout and make it pointless.
     */
    const user = fakeUser({ failedLoginAttempts: MAX_FAILED_LOGINS - 1 });
    stubFindOne(user);

    await expect(authenticate('a@b.com', 'wrong')).rejects.toThrow();

    expect(user.refreshTokens).toEqual([]);
  });

  it('refuses a locked account even when the password is right', async () => {
    const user = fakeUser({
      lockedUntil: new Date(Date.now() + LOCKOUT_MS),
      comparePassword: jest.fn().mockResolvedValue(true),
    });
    stubFindOne(user);

    await expect(authenticate('a@b.com', 'correct')).rejects.toThrow(
      /Too many failed sign-in attempts/,
    );

    // The password must not even be checked while locked.
    expect(user.comparePassword).not.toHaveBeenCalled();
  });

  it('lets the account back in once the lock expires', async () => {
    const user = fakeUser({
      lockedUntil: new Date(Date.now() - 1000),
      failedLoginAttempts: MAX_FAILED_LOGINS,
      comparePassword: jest.fn().mockResolvedValue(true),
    });
    stubFindOne(user);

    await expect(authenticate('a@b.com', 'correct')).resolves.toBe(user);

    expect(user.failedLoginAttempts).toBe(0);
    expect(user.lockedUntil).toBeUndefined();
  });

  it('a success resets the counter, so the threshold is consecutive failures', async () => {
    const user = fakeUser({
      failedLoginAttempts: MAX_FAILED_LOGINS - 1,
      comparePassword: jest.fn().mockResolvedValue(true),
    });
    stubFindOne(user);

    await authenticate('a@b.com', 'correct');

    expect(user.failedLoginAttempts).toBe(0);
  });

  it('gives an unknown address the same error as a wrong password', async () => {
    // Anything else turns this endpoint into a list of who works here.
    stubFindOne(null);

    await expect(authenticate('nobody@b.com', 'x')).rejects.toThrow(
      /Incorrect email or password/,
    );
  });
});
