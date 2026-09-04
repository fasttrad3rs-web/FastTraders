/**
 * Throwaway environment for the scripts in this directory.
 *
 * A separate module because `import` statements are hoisted: assignments
 * written at the top of a script still run *after* every import has been
 * evaluated, so the app's Zod environment check would fail before they
 * happened. Imports execute in order, though — so importing this first works.
 *
 * Nothing here opens a socket, a mailbox or a database.
 *
 * IMPORTANT: these are placeholders, and this module does NOT read `.env`.
 * It exists for scripts that must satisfy the app's Zod check without talking
 * to anything real — `seed-dryrun`, `routes`, `api-audit`. A script that needs
 * *actual* credentials must `import 'dotenv/config'` instead, or it will
 * authenticate as cloud "scripts" with the password "scripts" and fail in a
 * way that looks like a credential problem on the user's account.
 *
 * That is not hypothetical: `verify-cloudinary` imported this by mistake and
 * reported a Cloudinary auth failure against perfectly good credentials.
 */
process.env.NODE_ENV ??= 'test';
process.env.PORT ??= '5050';
process.env.MONGO_URI ??= 'mongodb://127.0.0.1:27017/fast_traders_scripts';
process.env.JWT_ACCESS_SECRET ??= 'scripts_access_secret_at_least_32_characters_x';
process.env.JWT_REFRESH_SECRET ??= 'scripts_refresh_secret_at_least_32_characters_y';
process.env.ACCESS_EXPIRY ??= '15m';
process.env.REFRESH_EXPIRY ??= '7d';
process.env.CLIENT_URL ??= 'https://www.fasttraders.co';
process.env.CLOUDINARY_CLOUD_NAME ??= 'scripts';
process.env.CLOUDINARY_API_KEY ??= 'scripts';
process.env.CLOUDINARY_API_SECRET ??= 'scripts';
process.env.CLOUDINARY_FOLDER ??= 'scripts';
process.env.SMTP_HOST ??= 'smtp.example.com';
process.env.SMTP_PORT ??= '587';
process.env.SMTP_SECURE ??= 'false';
process.env.SMTP_USER ??= 'scripts@example.com';
process.env.SMTP_PASS ??= 'scripts';
process.env.SMTP_FROM ??= 'Fast Traders <scripts@example.com>';
process.env.ADMIN_EMAIL ??= 'scripts@example.com';
process.env.LOG_LEVEL ??= 'error';
process.env.RATE_LIMIT_WINDOW_MS ??= '900000';
process.env.RATE_LIMIT_MAX ??= '100000';

export {};
