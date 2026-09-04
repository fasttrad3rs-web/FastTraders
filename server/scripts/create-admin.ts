/* eslint-disable no-console */
/**
 * Create or update a staff account.
 *
 *   npx tsx scripts/create-admin.ts --email sharjeel@fasttraders.co --name "Sharjeel Bin Ejaz"
 *   npx tsx scripts/create-admin.ts --email x@y.com --role manager --password 'chosen-password'
 *   npx tsx scripts/create-admin.ts --email x@y.com --deactivate
 *
 * There is no invite-a-user screen in the admin panel, deliberately: a
 * public-facing invite flow is real attack surface, and this is a two-person
 * business that adds a staff account roughly never. A script that an operator
 * runs once is the smaller risk.
 *
 * Reads `.env` via `dotenv/config`, NOT `./env-setup` — that module assigns
 * placeholder values for offline validation and would happily "connect" to a
 * database called `scripts`.
 */
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { User } from '../src/models';
import { describeError } from './lib/describe-error';

type Role = 'admin' | 'manager';

interface Options {
  email: string;
  name: string;
  role: Role;
  password?: string;
  deactivate: boolean;
}

function parseArgs(argv: string[]): Options | string {
  const get = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index === -1 ? undefined : argv[index + 1];
  };

  const email = get('--email')?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return 'A valid --email is required.';
  }

  const role = (get('--role') ?? 'admin') as Role;
  if (role !== 'admin' && role !== 'manager') {
    return "--role must be 'admin' or 'manager'.";
  }

  const password = get('--password') ?? process.env.SEED_ADMIN_PASSWORD;
  if (password !== undefined && password.length < 10) {
    return 'Password must be at least 10 characters.';
  }

  return {
    email,
    name: get('--name') ?? email.split('@')[0] ?? 'Staff',
    role,
    ...(password ? { password } : {}),
    deactivate: argv.includes('--deactivate'),
  };
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  if (typeof parsed === 'string') {
    console.error(`\n  ${parsed}\n`);
    process.exit(2);
  }

  await connectDatabase();

  const existing = await User.findOne({ email: parsed.email }).select('+passwordHash');

  /* ---------------------------- Deactivate ---------------------------- */
  if (parsed.deactivate) {
    if (!existing) {
      console.error(`\n  No account found for ${parsed.email}\n`);
      process.exit(1);
    }

    existing.isActive = false;
    /*
     * Clearing the refresh tokens is the part people forget. Deactivating
     * alone leaves any signed-in session working until its token expires,
     * which for somebody who just left the business is exactly wrong.
     */
    existing.refreshTokens = [];
    await existing.save();

    console.log(`\n  Deactivated ${parsed.email} and revoked all sessions.\n`);
    return;
  }

  /* ------------------------- Create or update ------------------------- */
  // Printed once and never stored anywhere legible. If it is lost, re-run.
  const generated = randomBytes(12).toString('base64url');
  const password = parsed.password ?? generated;

  if (existing) {
    existing.name = parsed.name;
    existing.role = parsed.role;
    existing.isActive = true;
    existing.failedLoginAttempts = 0;
    existing.lockedUntil = undefined;
    // Assigning the plain password; the pre-save hook hashes it at cost 12.
    existing.passwordHash = password;
    await existing.save();

    console.log(`\n  Updated ${parsed.email} (${parsed.role}), unlocked and reactivated.`);
  } else {
    await User.create({
      name: parsed.name,
      email: parsed.email,
      phone: '+923244234990',
      passwordHash: password,
      role: parsed.role,
      isActive: true,
    });

    console.log(`\n  Created ${parsed.email} (${parsed.role}).`);
  }

  if (!parsed.password) {
    console.log(`  Password: ${password}`);
    console.log('  Shown once. Save it in a password manager now.\n');
  } else {
    console.log('  Password set from the value you supplied.\n');
  }
}

main()
  .catch((error: unknown) => {
    console.error(`\n  Failed: ${describeError(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    void disconnectDatabase();
  });
