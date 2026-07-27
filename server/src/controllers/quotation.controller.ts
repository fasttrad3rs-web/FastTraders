import { Types } from 'mongoose';
import type { Request, Response } from 'express';
import { Product, Quotation, type IProduct, type QuotationDocument } from '../models';
import { recordAudit } from '../services/audit.service';
import { clearCart, getOrCreateCart } from '../services/cart.service';
import { email } from '../services/email';
import { cartOwner, readSessionId } from '../services/session.service';
import { ApiError } from '../utils/ApiError';
import { sendCreated, sendSuccess } from '../utils/ApiResponse';
import { buildMeta, toSkip } from '../utils/pagination';
import type { CreateQuotationInput, RespondQuotationInput } from '../validators';

/** RFQ submission and the customer side of the negotiation. */

type LeanProduct = IProduct & { _id: Types.ObjectId };

function toEmailItems(quotation: QuotationDocument): { name: string; sku: string; qty: number }[] {
  return quotation.items.map((item) => ({ name: item.name, sku: item.sku, qty: item.qty }));
}

export async function createQuotation(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateQuotationInput;

  const owner = cartOwner(req, readSessionId(req));
  const cart = await getOrCreateCart(owner, 'inquiry');

  if (cart.items.length === 0) {
    throw ApiError.badRequest('Your inquiry list is empty');
  }

  const products = await Product.find({
    _id: { $in: cart.items.map((item) => item.product) },
  }).lean<LeanProduct[]>();
  const byId = new Map(products.map((product) => [product._id.toString(), product]));

  const items = cart.items.flatMap((cartItem) => {
    const product = byId.get(cartItem.product.toString());
    if (!product || !product.isActive) return [];
    return [
      {
        product: product._id,
        name: product.name,
        sku: product.sku,
        qty: cartItem.qty,
        unit: product.unit,
        ...(cartItem.note ? { customerNote: cartItem.note } : {}),
      },
    ];
  });

  if (items.length === 0) {
    throw ApiError.badRequest('None of the items on your inquiry list are still available');
  }

  const quotation = await Quotation.create({
    user: req.user ? new Types.ObjectId(req.user.id) : null,
    customer: input.customer,
    items,
    ...(input.message ? { message: input.message } : {}),
    ...(input.requiredBy ? { requiredBy: input.requiredBy } : {}),
    status: 'new',
  });

  await clearCart(owner, 'inquiry');

  const emailItems = toEmailItems(quotation);
  email.quotationReceived(quotation.customer.email, {
    quoteNumber: quotation.quoteNumber,
    customerName: quotation.customer.name,
    items: emailItems,
    ...(quotation.message ? { message: quotation.message } : {}),
  });
  email.newQuotationAlert({
    quoteNumber: quotation.quoteNumber,
    customerName: quotation.customer.name,
    items: emailItems,
    ...(quotation.message ? { message: quotation.message } : {}),
    customerPhone: quotation.customer.phone,
    customerEmail: quotation.customer.email,
    ...(quotation.customer.companyName ? { company: quotation.customer.companyName } : {}),
  });

  sendCreated(
    res,
    quotation.toJSON(),
    `Request ${quotation.quoteNumber} received. We will respond within one working day.`,
  );
}

export async function listMyQuotations(req: Request, res: Response): Promise<void> {
  const { page, limit, status } = req.query as unknown as {
    page: number;
    limit: number;
    status?: string;
  };

  const filter = { user: req.user?.id, ...(status ? { status } : {}) };

  const [items, total] = await Promise.all([
    Quotation.find(filter).sort({ createdAt: -1 }).skip(toSkip(page, limit)).limit(limit).lean(),
    Quotation.countDocuments(filter),
  ]);

  sendSuccess(res, { items, meta: buildMeta(total, page, limit) }, `${total} quotation(s)`);
}

async function loadAccessible(req: Request, quoteNumber: string): Promise<QuotationDocument> {
  const quotation = await Quotation.findOne({ quoteNumber });
  if (!quotation) throw ApiError.notFound('Quotation not found');

  const { email: guestEmail } = req.query as { email?: string };
  const isStaff = req.user?.role === 'admin' || req.user?.role === 'manager';
  const isOwner = Boolean(req.user && quotation.user?.toString() === req.user.id);
  const isGuestMatch =
    !req.user &&
    typeof guestEmail === 'string' &&
    guestEmail.toLowerCase() === quotation.customer.email.toLowerCase();

  if (!isStaff && !isOwner && !isGuestMatch) {
    throw ApiError.forbidden('You do not have access to this quotation');
  }

  return quotation;
}

export async function getQuotation(req: Request, res: Response): Promise<void> {
  const { quoteNumber } = req.params as { quoteNumber: string };
  const quotation = await loadAccessible(req, quoteNumber);

  sendSuccess(res, quotation.toJSON(), `Quotation ${quotation.quoteNumber}`);
}

/** Customer accepts, rejects or counters a priced quotation. */
const RESPONDABLE = ['quoted', 'negotiating'] as const;

export async function respondToQuotation(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { action, message } = req.body as RespondQuotationInput;

  const quotation = await Quotation.findById(id);
  if (!quotation) throw ApiError.notFound('Quotation not found');

  const isStaff = req.user?.role === 'admin' || req.user?.role === 'manager';
  const isOwner = Boolean(req.user && quotation.user?.toString() === req.user.id);
  if (!isStaff && !isOwner) throw ApiError.forbidden('You do not have access to this quotation');

  if (!RESPONDABLE.includes(quotation.status as (typeof RESPONDABLE)[number])) {
    throw ApiError.badRequest(
      `You can only respond once we have priced your request (current status: ${quotation.status})`,
    );
  }
  if (quotation.validUntil && quotation.validUntil.getTime() < Date.now()) {
    quotation.status = 'expired';
    await quotation.save();
    throw ApiError.badRequest('This quotation has expired. Please request a fresh one.');
  }

  const previousStatus = quotation.status;
  quotation.status = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'negotiating';

  if (message) {
    const stamp = new Date().toISOString().slice(0, 10);
    quotation.adminNotes = `${quotation.adminNotes ?? ''}\n[${stamp}] Customer (${action}): ${message}`.trim();
  }

  await quotation.save();

  recordAudit({
    req,
    action: 'status_change',
    entity: 'Quotation',
    entityId: quotation._id.toString(),
    before: { status: previousStatus },
    after: { status: quotation.status, action },
  });

  const responses: Record<string, string> = {
    accept: 'Quotation accepted. Our team will confirm your order shortly.',
    reject: 'Quotation rejected. Thank you for letting us know.',
    counter: 'Counter-offer sent. We will get back to you.',
  };

  sendSuccess(res, quotation.toJSON(), responses[action] ?? 'Response recorded');
}
