import { Types, type FilterQuery } from 'mongoose';
import type { Request, Response } from 'express';
import { Quotation, Setting, type IQuotation, type ISetting } from '../../models';
import { recordAudit } from '../../services/audit.service';
import { dispatchEmail, email } from '../../services/email';
import { quotationReadyEmail } from '../../services/email/templates.commerce';
import { generateQuotationPdf } from '../../services/pdf';
import * as service from '../../services/quotation.admin.service';
import { ApiError } from '../../utils/ApiError';
import { sendCreated, sendSuccess } from '../../utils/ApiResponse';
import { buildMeta, toSkip } from '../../utils/pagination';
import type {
  AdminQuotationQuery,
  ConvertQuotationInput,
  PriceQuotationInput,
} from '../../validators';

/** Admin RFQ pipeline: price, send, assign, convert. */

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  required_by: { requiredBy: 1 },
};

export async function listQuotations(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as AdminQuotationQuery;

  // Sweep lapsed validity windows so the board is never misleading.
  await service.expireStaleQuotations();

  const filter: FilterQuery<IQuotation> = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.assignedTo ? { assignedTo: new Types.ObjectId(query.assignedTo) } : {}),
    ...(query.unassigned ? { assignedTo: null } : {}),
  };

  if (query.from || query.to) {
    filter.createdAt = {
      ...(query.from ? { $gte: query.from } : {}),
      ...(query.to ? { $lte: query.to } : {}),
    };
  }

  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const term = new RegExp(escaped, 'i');
    filter.$or = [
      { quoteNumber: term },
      { 'customer.name': term },
      { 'customer.email': term },
      { 'customer.companyName': term },
    ];
  }

  const [items, total] = await Promise.all([
    Quotation.find(filter)
      .populate({ path: 'assignedTo', select: 'name email' })
      .sort(SORTS[query.sort] ?? SORTS.newest ?? { createdAt: -1 })
      .skip(toSkip(query.page, query.limit))
      .limit(query.limit)
      .lean(),
    Quotation.countDocuments(filter),
  ]);

  sendSuccess(res, { items, meta: buildMeta(total, query.page, query.limit) }, `${total} quotation(s)`);
}

export async function getQuotation(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const quotation = await Quotation.findById(id)
    .populate({ path: 'assignedTo', select: 'name email' })
    .populate({ path: 'user', select: 'name email phone companyName' })
    .populate({ path: 'convertedOrder', select: 'orderNumber total orderStatus' });

  if (!quotation) throw ApiError.notFound('Quotation not found');
  sendSuccess(res, quotation.toJSON(), `Quotation ${quotation.quoteNumber}`);
}

export async function priceQuotation(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const quotation = await Quotation.findById(id);
  if (!quotation) throw ApiError.notFound('Quotation not found');

  const before = { status: quotation.status, quotedTotal: quotation.quotedTotal };
  await service.priceQuotation(quotation, req.body as PriceQuotationInput);

  recordAudit({
    req,
    action: 'update',
    entity: 'Quotation',
    entityId: id,
    before,
    after: { status: quotation.status, quotedTotal: quotation.quotedTotal },
  });

  sendSuccess(res, quotation.toJSON(), `Quotation priced — status is now ${quotation.status}`);
}

/** Email the formal PDF quotation to the customer. */
export async function sendQuotation(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const quotation = await Quotation.findById(id);
  if (!quotation) throw ApiError.notFound('Quotation not found');

  const unpriced = quotation.items.filter((item) => typeof item.quotedUnitPrice !== 'number');
  if (unpriced.length > 0) {
    throw ApiError.badRequest(
      `Price every line before sending: ${unpriced.map((item) => item.sku).join(', ')}`,
    );
  }

  const settings = await Setting.findOne({ key: 'global' })
    .select('bankDetails defaultTaxRate')
    .lean<Pick<ISetting, 'bankDetails' | 'defaultTaxRate'>>();

  const pdf = await generateQuotationPdf({ quotation: quotation.toObject(), settings });

  const items = quotation.items.map((item) => ({ name: item.name, sku: item.sku, qty: item.qty }));
  const content = quotationReadyEmail({
    quoteNumber: quotation.quoteNumber,
    customerName: quotation.customer.name,
    items,
    total: quotation.quotedTotal ?? 0,
    ...(quotation.validUntil
      ? { validUntil: quotation.validUntil.toISOString().slice(0, 10) }
      : {}),
  });

  dispatchEmail({
    to: quotation.customer.email,
    content: {
      ...content,
      // Attachment support rides on the same Nodemailer message.
      html: content.html,
    },
    attachments: [
      {
        filename: `quotation-${quotation.quoteNumber}.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      },
    ],
  });

  if (quotation.status === 'new' || quotation.status === 'reviewing') {
    quotation.status = 'quoted';
    await quotation.save();
  }

  recordAudit({
    req,
    action: 'update',
    entity: 'Quotation',
    entityId: id,
    after: { sentTo: quotation.customer.email, status: quotation.status },
  });

  sendSuccess(
    res,
    { quoteNumber: quotation.quoteNumber, sentTo: quotation.customer.email, bytes: pdf.length },
    `Quotation emailed to ${quotation.customer.email}`,
  );
}

export async function downloadQuotationPdf(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const quotation = await Quotation.findById(id).lean<IQuotation>();
  if (!quotation) throw ApiError.notFound('Quotation not found');

  const settings = await Setting.findOne({ key: 'global' })
    .select('bankDetails defaultTaxRate')
    .lean<Pick<ISetting, 'bankDetails' | 'defaultTaxRate'>>();

  const pdf = await generateQuotationPdf({ quotation, settings });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="quotation-${quotation.quoteNumber}.pdf"`);
  res.setHeader('Content-Length', pdf.length);
  res.send(pdf);
}

export async function convertQuotation(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const quotation = await Quotation.findById(id);
  if (!quotation) throw ApiError.notFound('Quotation not found');

  const order = await service.convertToOrder(quotation, req.body as ConvertQuotationInput);

  email.orderConfirmation(order.customer.email, {
    orderNumber: order.orderNumber,
    customerName: order.customer.name,
    items: order.items.map((item) => ({
      name: item.name,
      sku: item.sku,
      qty: item.qty,
      price: item.price,
    })),
    subtotal: order.subtotal,
    taxAmount: order.taxAmount,
    shippingCost: order.shippingCost,
    discount: order.discount,
    total: order.total,
    paymentMethod: order.paymentMethod,
    shippingCity: order.shippingAddress.city,
  });

  recordAudit({
    req,
    action: 'create',
    entity: 'Order',
    entityId: order._id.toString(),
    after: { orderNumber: order.orderNumber, fromQuotation: quotation.quoteNumber },
  });

  sendCreated(
    res,
    { order: order.toJSON(), quotation: quotation.toJSON() },
    `Order ${order.orderNumber} created from ${quotation.quoteNumber}`,
  );
}

export async function assignQuotation(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { assignedTo } = req.body as { assignedTo: string | null };

  const quotation = await Quotation.findById(id);
  if (!quotation) throw ApiError.notFound('Quotation not found');

  const before = quotation.assignedTo?.toString() ?? null;
  quotation.assignedTo = assignedTo ? new Types.ObjectId(assignedTo) : null;

  // Picking up a brand-new RFQ moves it into review.
  if (assignedTo && quotation.status === 'new') quotation.status = 'reviewing';
  await quotation.save();

  recordAudit({
    req,
    action: 'update',
    entity: 'Quotation',
    entityId: id,
    before: { assignedTo: before },
    after: { assignedTo },
  });

  sendSuccess(res, quotation.toJSON(), assignedTo ? 'Quotation assigned' : 'Quotation unassigned');
}
