/**
 * Environment for the test process.
 *
 * `config/env.ts` validates with Zod and exits the process on a missing
 * variable, which is correct at boot and fatal inside Jest. These are throwaway
 * values — nothing in this suite opens a socket, a mailbox or a database.
 */
process.env.NODE_ENV = 'test';
process.env.PORT = '5050';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/fast_traders_test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_at_least_32_characters_long';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_at_least_32_characters_different';
process.env.ACCESS_EXPIRY = '15m';
process.env.REFRESH_EXPIRY = '7d';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.CLOUDINARY_CLOUD_NAME = 'test';
process.env.CLOUDINARY_API_KEY = 'test';
process.env.CLOUDINARY_API_SECRET = 'test';
process.env.CLOUDINARY_FOLDER = 'fast-traders-test';
process.env.SMTP_HOST = 'smtp.example.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_SECURE = 'false';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASS = 'test';
process.env.SMTP_FROM = 'Fast Traders <test@example.com>';
process.env.ADMIN_EMAIL = 'test@example.com';
process.env.LOG_LEVEL = 'error';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX = '100000';
