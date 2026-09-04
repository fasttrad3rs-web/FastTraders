import { Types } from 'mongoose';
import type { Response } from 'express';
import { sendSuccess } from '../utils/ApiResponse';

/**
 * `_id` normalisation, which now sits on every response the API sends.
 *
 * A hydrated Mongoose document is serialised by `jsonTransform` and reaches
 * the client with `id`. A `.lean()` result skips the schema entirely and keeps
 * `_id` — so every admin list, all of which use `.lean()` for the speed, was
 * emitting a shape the client could not read. The symptom was a link to
 * `/admin/inquiries/undefined` and a detail page stuck on its skeleton.
 */

/** Minimal Express double: records what would have been sent. */
function fakeRes(): { res: Response; body: () => Record<string, unknown> } {
  let captured: Record<string, unknown> = {};
  const res = {
    status: () => res,
    json: (value: Record<string, unknown>) => {
      captured = value;
      return res;
    },
  } as unknown as Response;

  return { res, body: () => captured };
}

const dataOf = (body: Record<string, unknown>): Record<string, unknown> =>
  body.data as Record<string, unknown>;

describe('sendSuccess — id normalisation', () => {
  it('renames a top-level _id', () => {
    const id = new Types.ObjectId();
    const { res, body } = fakeRes();

    sendSuccess(res, { _id: id, name: 'Terasaki S250-NJ' });

    expect(dataOf(body()).id).toBe(id.toHexString());
    expect(dataOf(body())._id).toBeUndefined();
  });

  it('renames _id inside every row of a list', () => {
    // The exact shape that broke: an admin list from `.lean()`.
    const { res, body } = fakeRes();
    const rows = [{ _id: new Types.ObjectId() }, { _id: new Types.ObjectId() }];

    sendSuccess(res, { items: rows, meta: { total: 2 } });

    const items = dataOf(body()).items as { id?: string; _id?: unknown }[];
    expect(items.every((row) => typeof row.id === 'string')).toBe(true);
    expect(items.every((row) => row._id === undefined)).toBe(true);
  });

  it('reaches into populated refs and nested arrays', () => {
    const { res, body } = fakeRes();

    sendSuccess(res, {
      _id: new Types.ObjectId(),
      assignedTo: { _id: new Types.ObjectId(), name: 'Sharjeel' },
      items: [{ _id: new Types.ObjectId(), product: { _id: new Types.ObjectId() } }],
    });

    const data = dataOf(body()) as {
      id: string;
      assignedTo: { id: string };
      items: { id: string; product: { id: string } }[];
    };

    expect(typeof data.id).toBe('string');
    expect(typeof data.assignedTo.id).toBe('string');
    expect(typeof data.items[0]?.product.id).toBe('string');
  });

  it('drops __v', () => {
    const { res, body } = fakeRes();
    sendSuccess(res, { _id: new Types.ObjectId(), __v: 3, name: 'x' });
    expect(dataOf(body()).__v).toBeUndefined();
  });

  it('leaves Dates alone rather than walking into them', () => {
    // A Date is an object but not a plain one; treating it as a record would
    // return `{}` and quietly destroy every timestamp in the API.
    const { res, body } = fakeRes();
    const createdAt = new Date('2026-07-30T10:00:00.000Z');

    sendSuccess(res, { _id: new Types.ObjectId(), createdAt });

    expect(dataOf(body()).createdAt).toBeInstanceOf(Date);
    expect((dataOf(body()).createdAt as Date).toISOString()).toBe(createdAt.toISOString());
  });

  it('passes null and primitives through untouched', () => {
    const { res, body } = fakeRes();
    sendSuccess(res, null);
    expect(body().data).toBeNull();
  });

  it('does not invent an id where there was none', () => {
    const { res, body } = fakeRes();
    sendSuccess(res, { inquiryNumber: 'FT-INQ-202607-0065' });

    expect(dataOf(body())).toEqual({ inquiryNumber: 'FT-INQ-202607-0065' });
  });
});
