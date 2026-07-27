import mongoose from 'mongoose';
import { env, isProduction } from './env';
import { logger } from './logger';

/**
 * MongoDB connection with bounded exponential-backoff retry and full
 * connection-event logging. Mongoose handles reconnection once connected;
 * the retry loop here covers the initial boot (Atlas cold start, DNS, etc.).
 */

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2_000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Mask credentials before a URI ever reaches a log line. */
function redactUri(uri: string): string {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
}

function registerConnectionEvents(): void {
  const connection = mongoose.connection;

  connection.on('connected', () => {
    logger.info(`[db] Connected to MongoDB (${connection.name})`);
  });

  connection.on('reconnected', () => {
    logger.info('[db] Reconnected to MongoDB');
  });

  connection.on('disconnected', () => {
    logger.warn('[db] Disconnected from MongoDB');
  });

  connection.on('error', (error: Error) => {
    logger.error(`[db] Connection error: ${error.message}`, { stack: error.stack });
  });
}

export async function connectDatabase(): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  // Verbose query logging is useful locally, far too noisy in production.
  mongoose.set('debug', !isProduction && env.LOG_LEVEL === 'debug');

  registerConnectionEvents();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      logger.info(`[db] Connecting to ${redactUri(env.MONGO_URI)} (attempt ${attempt}/${MAX_RETRIES})`);

      return await mongoose.connect(env.MONGO_URI, {
        serverSelectionTimeoutMS: 10_000,
        socketTimeoutMS: 45_000,
        maxPoolSize: 10,
        minPoolSize: 1,
        autoIndex: !isProduction, // build indexes explicitly in production
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[db] Connection attempt ${attempt} failed: ${message}`);

      if (attempt === MAX_RETRIES) {
        throw new Error(`Could not connect to MongoDB after ${MAX_RETRIES} attempts: ${message}`);
      }

      const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
      logger.warn(`[db] Retrying in ${delay / 1000}s...`);
      await sleep(delay);
    }
  }

  // Unreachable: the loop either returns or throws.
  throw new Error('[db] Unexpected end of connection routine');
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === mongoose.ConnectionStates.disconnected) return;
  await mongoose.connection.close(false);
  logger.info('[db] MongoDB connection closed');
}
