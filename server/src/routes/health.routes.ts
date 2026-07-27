import { Router } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { sendSuccess } from '../utils/ApiResponse';

/**
 * Liveness / readiness probe. Used by Railway/Render health checks and by
 * uptime monitoring.
 */
const router: Router = Router();

const READY_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

router.get('/', (_req, res) => {
  const dbState = READY_STATES[mongoose.connection.readyState] ?? 'unknown';

  sendSuccess(
    res,
    {
      status: 'ok',
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      database: dbState,
      timestamp: new Date().toISOString(),
    },
    'Fast Traders API is healthy',
  );
});

export default router;
