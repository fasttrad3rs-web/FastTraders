import { Schema, model, type Model } from 'mongoose';

/**
 * Atomic sequence generator backing human-readable document numbers
 * (`FT-202607-0001`, `FTQ-202607-0001`).
 *
 * One document per scope+period, incremented with a single upsert so
 * concurrent requests can never collide.
 */
export interface ICounter {
  /** e.g. `quote:202607`. */
  _id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false },
);

export const Counter: Model<ICounter> = model<ICounter>('Counter', counterSchema);

/** `YYYYMM` for the current month, used as the sequence period. */
function currentPeriod(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

/**
 * Build the next document number for a scope.
 *
 *   await nextDocumentNumber('quote', 'FTQ')  // -> 'FTQ-202607-0001'
 */
export async function nextDocumentNumber(
  scope: string,
  prefix: string,
  padding = 4,
): Promise<string> {
  const period = currentPeriod();
  const counter = await Counter.findByIdAndUpdate(
    `${scope}:${period}`,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean<ICounter>();

  const seq = counter?.seq ?? 1;
  return `${prefix}-${period}-${String(seq).padStart(padding, '0')}`;
}
