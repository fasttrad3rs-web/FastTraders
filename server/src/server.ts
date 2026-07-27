import type { Server } from 'node:http';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/db';
import { env } from './config/env';
import { logger } from './config/logger';
import { verifyMailer } from './services/email';

/**
 * Entrypoint: validate env (side effect of importing ./config/env) → connect to
 * MongoDB → start HTTP server → wire graceful shutdown.
 */

const SHUTDOWN_TIMEOUT_MS = 10_000;

let server: Server | undefined;
let shuttingDown = false;

async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`[server] ${signal} received — shutting down gracefully`);

  // Hard exit if something hangs (open sockets, stuck query).
  const forceExit = setTimeout(() => {
    logger.error('[server] Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => (error ? reject(error) : resolve()));
      });
      logger.info('[server] HTTP server closed');
    }

    await disconnectDatabase();
    clearTimeout(forceExit);
    logger.info('[server] Shutdown complete');
    process.exit(exitCode);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[server] Error during shutdown: ${message}`);
    process.exit(1);
  }
}

async function bootstrap(): Promise<void> {
  await connectDatabase();

  // Non-fatal: a bad SMTP config logs loudly but must not stop the API.
  await verifyMailer();

  const app = createApp();

  server = app.listen(env.PORT, () => {
    logger.info(`[server] Fast Traders API listening on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`[server] Allowed origins: ${env.CLIENT_URL.join(', ')}`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`[server] Port ${env.PORT} is already in use`);
      process.exit(1);
    }
    throw error;
  });

  // Give slow 3G clients room to finish; must exceed the proxy's idle timeout.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
}

/* ------------------------- Process-level handlers ------------------------- */

process.on('unhandledRejection', (reason: unknown) => {
  const message = reason instanceof Error ? reason.stack : String(reason);
  logger.error(`[process] Unhandled promise rejection: ${message}`);
  void shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (error: Error) => {
  logger.error(`[process] Uncaught exception: ${error.stack ?? error.message}`);
  void shutdown('uncaughtException', 1);
});

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack : String(error);
  logger.error(`[server] Failed to start: ${message}`);
  process.exit(1);
});
