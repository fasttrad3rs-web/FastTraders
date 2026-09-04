import { Types } from 'mongoose';
import type { Request } from 'express';
import { Inquiry, Product, type IProduct, type InquiryDocument } from '../models';
import { email } from './email';
import { alertShop } from './notify.service';
import { ApiError } from '../utils/ApiError';
import type { IInquiryCustomer, IInquiryItem } from '../models';
import type { InquirySource, InquiryType } from '../types';

/**
 * Inquiry creation.
 *
 * Shared by the product-inquiry and sourcing paths so both record request
 * provenance the same way and both notify through the same code.
 */

type LeanProduct = IProduct & {
  _id: Types.ObjectId;
  brand?: { name?: string } | Types.ObjectId | null;
};

/** Where the request came from, for abuse triage. Never shown to a customer. */
export function requestProvenance(req: Request): { ipAddress?: string; userAgent?: string } {
  const agent = req.get('user-agent');
  return {
    ...(req.ip ? { ipAddress: req.ip } : {}),
    ...(agent ? { userAgent: agent.slice(0, 400) } : {}),
  };
}

/**
 * Turn shortlist entries into inquiry lines.
 *
 * Name, SKU and brand are copied in rather than referenced: the inquiry is a
 * record of what was asked for on the day, and a product renamed next year
 * must not silently rewrite it. Inactive products are dropped — quoting
 * something we have delisted wastes everyone's morning.
 */
export async function buildItemsFromList(
  entries: { product: Types.ObjectId; qty: number; note?: string }[],
): Promise<IInquiryItem[]> {
  if (entries.length === 0) return [];

  const products = await Product.find({ _id: { $in: entries.map((entry) => entry.product) } })
    .select('name sku unit isActive brand')
    .populate({ path: 'brand', select: 'name' })
    .lean<LeanProduct[]>();

  const byId = new Map(products.map((product) => [product._id.toString(), product]));

  return entries.flatMap((entry) => {
    const product = byId.get(entry.product.toString());
    if (!product || !product.isActive) return [];

    const brandName =
      product.brand && typeof product.brand === 'object' && 'name' in product.brand
        ? product.brand.name
        : undefined;

    return [
      {
        product: product._id,
        name: product.name,
        sku: product.sku,
        ...(brandName ? { brand: brandName } : {}),
        qty: entry.qty,
        unit: product.unit,
        ...(entry.note ? { note: entry.note } : {}),
      },
    ];
  });
}

export interface CreateInquiryArgs {
  /**
   * Spam heuristics computed by the caller. Advisory only — a high score has
   * never stopped an inquiry being created, and must not start doing so.
   */
  spam?: { score: number; reasons: string[] };
  type: InquiryType;
  customer: IInquiryCustomer;
  items?: IInquiryItem[];
  sourcingDetails?: Record<string, unknown>;
  message?: string;
  preferredContactMethod?: 'phone' | 'whatsapp' | 'email';
  preferredContactTime?: string;
  source?: InquirySource;
  provenance?: { ipAddress?: string; userAgent?: string };
}

export async function createInquiry(args: CreateInquiryArgs): Promise<InquiryDocument> {
  const inquiry = await Inquiry.create({
    type: args.type,
    customer: args.customer,
    items: args.items ?? [],
    ...(args.sourcingDetails ? { sourcingDetails: args.sourcingDetails } : {}),
    ...(args.message ? { message: args.message } : {}),
    preferredContactMethod: args.preferredContactMethod ?? 'phone',
    ...(args.preferredContactTime ? { preferredContactTime: args.preferredContactTime } : {}),
    status: 'new',
    source: args.source ?? 'website',
    ...args.provenance,
    ...(args.spam ? { spamScore: args.spam.score, spamReasons: args.spam.reasons } : {}),
  });

  notify(inquiry);
  return inquiry;
}

/**
 * Fire the alert and, if we have an address, the acknowledgement.
 *
 * Not awaited by the caller — a slow SMTP handshake must not hold up the
 * response to somebody who just pressed Send on their phone.
 */
export function notify(inquiry: InquiryDocument): void {
  email.newInquiryAlert(inquiry);
  // Feature-flagged, non-throwing, and a no-op unless Twilio is configured.
  alertShop(inquiry);

  // Only if they gave one. Phone is the required channel here, not email.
  if (inquiry.customer.email) {
    email.inquiryReceived(inquiry.customer.email, inquiry);
  }
}

export async function findByNumberOrId(identifier: string): Promise<InquiryDocument> {
  const inquiry = Types.ObjectId.isValid(identifier)
    ? await Inquiry.findById(identifier)
    : await Inquiry.findOne({ inquiryNumber: identifier.toUpperCase() });

  if (!inquiry) throw ApiError.notFound('Inquiry not found');
  return inquiry;
}
