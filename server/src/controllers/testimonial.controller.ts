import { Types } from 'mongoose';
import type { Request, Response } from 'express';
import { Testimonial } from '../models';
import { sendSuccess } from '../utils/ApiResponse';

/**
 * Public testimonials.
 *
 * Read-only by design: with no customer accounts there is no way to verify a
 * submitter, so quotes are entered by staff from real correspondence.
 */
export async function listTestimonials(req: Request, res: Response): Promise<void> {
  const { product, limit } = req.query as { product?: string; limit?: string };
  const cap = Math.min(Number(limit) || 12, 50);

  const items = await Testimonial.find({
    isPublished: true,
    ...(product ? { product: new Types.ObjectId(product) } : {}),
  })
    .sort({ displayOrder: 1, createdAt: -1 })
    .limit(cap)
    .lean();

  sendSuccess(res, items, `${items.length} testimonial(s)`);
}
