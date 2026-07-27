import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { jsonTransform } from './shared.schemas';
import type { AuditAction } from '../types';

/**
 * Append-only admin activity trail. Entries expire after two years so the
 * collection cannot grow forever.
 */
const RETENTION_DAYS = 730;

export interface IAuditLog {
  /** Null for system-generated actions (webhooks, cron). */
  actor: Types.ObjectId | null;
  action: AuditAction;
  /** Model name, e.g. "Product". */
  entity: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
  at: Date;
}

export type AuditLogDocument = HydratedDocument<IAuditLog>;

const auditLogSchema = new Schema<IAuditLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    action: {
      type: String,
      enum: ['create', 'update', 'delete', 'login', 'logout', 'status_change'],
      required: true,
      index: true,
    },
    entity: { type: String, required: true, trim: true, index: true },
    entityId: { type: String, required: true, trim: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    ip: { type: String, trim: true },
    // Indexed below with a TTL — do not add `index: true` here as well.
    at: { type: Date, default: Date.now },
  },
  { versionKey: false, toJSON: jsonTransform, toObject: jsonTransform },
);

auditLogSchema.index({ entity: 1, entityId: 1, at: -1 });
auditLogSchema.index({ actor: 1, at: -1 });
auditLogSchema.index({ at: 1 }, { expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60 });

export const AuditLog: Model<IAuditLog> = model<IAuditLog>('AuditLog', auditLogSchema);
