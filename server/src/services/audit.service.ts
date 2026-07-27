import type { Request } from 'express';
import { logger } from '../config/logger';
import { AuditLog } from '../models';
import type { AuditAction } from '../types';

/**
 * Append-only audit trail for mutations.
 *
 * Writes are fire-and-forget: an audit failure must never break the operation
 * it is recording, but it must always be visible in the logs.
 */

export interface AuditEntry {
  req: Request;
  action: AuditAction;
  /** Model name, e.g. "Order". */
  entity: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

/** Strip anything sensitive before a snapshot is persisted. */
const REDACTED_KEYS = new Set([
  'passwordHash',
  'refreshTokens',
  'emailVerifyToken',
  'resetPasswordToken',
  'resetPasswordExpiry',
  'costPrice',
]);

function redact(snapshot?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!snapshot) return undefined;
  return Object.fromEntries(
    Object.entries(snapshot).filter(([key]) => !REDACTED_KEYS.has(key)),
  );
}

export function recordAudit({ req, action, entity, entityId, before, after }: AuditEntry): void {
  const entry = {
    actor: req.user?.id ?? null,
    action,
    entity,
    entityId,
    before: redact(before),
    after: redact(after),
    ip: req.ip,
    at: new Date(),
  };

  void AuditLog.create(entry).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[audit] Failed to record ${action} on ${entity}/${entityId}: ${message}`);
  });
}
