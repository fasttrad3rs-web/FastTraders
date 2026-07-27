import type { Request, Response } from 'express';
import { Order } from '../models';
import { recordAudit } from '../services/audit.service';
import { getProvider, listProviders, ProviderNotConfiguredError } from '../services/payments';
import { uploadBuffer } from '../services/upload.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/ApiResponse';
import type { PaymentMethod } from '../services/payments';

/** Customer-facing payment endpoints. */

/** Which rails the checkout should offer, and which are contracted. */
export function getPaymentMethods(_req: Request, res: Response): void {
  sendSuccess(res, listProviders(), 'Available payment methods');
}

/**
 * Start a gateway payment for an existing order.
 *
 * Deliberately separate from order creation: the order is persisted first, so
 * a failed or abandoned payment leaves a `pending` record an admin can chase
 * rather than vanishing entirely.
 */
export async function createPaymentIntent(req: Request, res: Response): Promise<void> {
  const { orderNumber } = req.params as { orderNumber: string };

  const order = await Order.findOne({ orderNumber });
  if (!order) throw ApiError.notFound('Order not found');

  if (order.paymentStatus === 'paid') {
    throw ApiError.badRequest('This order has already been paid');
  }

  const provider = getProvider(order.paymentMethod as PaymentMethod);

  try {
    const result = await provider.initiate(order);

    order.paymentDetails = {
      ...order.paymentDetails,
      provider: provider.method,
      reference: result.reference,
    };
    await order.save();

    sendSuccess(
      res,
      {
        method: provider.method,
        reference: result.reference,
        ...(result.clientSecret ? { clientSecret: result.clientSecret } : {}),
        ...(result.redirectUrl ? { redirectUrl: result.redirectUrl } : {}),
        ...(result.formFields ? { formFields: result.formFields } : {}),
        settledOffline: result.settledOffline ?? false,
      },
      result.settledOffline ? 'No online payment required' : 'Payment initiated',
    );
  } catch (error) {
    if (error instanceof ProviderNotConfiguredError) {
      // 503, not 500: the code is fine, the rail simply is not live yet.
      throw new ApiError(503, error.message);
    }
    throw error;
  }
}

/**
 * Upload a bank transfer receipt.
 *
 * Guests can do this with the checkout email, which is the same rule the order
 * lookup uses — nothing here is enumerable from the order number alone.
 */
export async function uploadPaymentProof(req: Request, res: Response): Promise<void> {
  const { orderNumber } = req.params as { orderNumber: string };
  const { email } = req.query as { email?: string };
  const file = req.file;

  if (!file) throw ApiError.badRequest('Attach the transfer receipt as `proof`');

  const order = await Order.findOne({ orderNumber });
  if (!order) throw ApiError.notFound('Order not found');

  const isOwner = Boolean(req.user && order.user?.toString() === req.user.id);
  const isStaff = req.user?.role === 'admin' || req.user?.role === 'manager';
  const isGuestMatch =
    !req.user && typeof email === 'string' && email.toLowerCase() === order.customer.email.toLowerCase();

  if (!isOwner && !isStaff && !isGuestMatch) {
    throw ApiError.forbidden('You do not have access to this order');
  }

  if (order.paymentMethod !== 'bank_transfer') {
    throw ApiError.badRequest('Payment proof only applies to bank transfer orders');
  }

  const uploaded = await uploadBuffer(file.buffer, 'payment-proofs');

  order.paymentDetails = {
    ...order.paymentDetails,
    proof: { url: uploaded.url, publicId: uploaded.publicId, uploadedAt: new Date() },
  };
  await order.save();

  recordAudit({
    req,
    action: 'update',
    entity: 'Order',
    entityId: order._id.toString(),
    after: { paymentProofUploaded: uploaded.publicId },
  });

  sendSuccess(
    res,
    { url: uploaded.url, uploadedAt: new Date().toISOString() },
    'Receipt uploaded. We will confirm your payment shortly.',
  );
}

/** Admin: confirm a bank transfer against the statement. */
export async function verifyPaymentProof(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const order = await Order.findById(id);
  if (!order) throw ApiError.notFound('Order not found');
  if (!order.paymentDetails.proof) throw ApiError.badRequest('No receipt has been uploaded');

  order.paymentDetails = {
    ...order.paymentDetails,
    proof: {
      ...order.paymentDetails.proof,
      verifiedAt: new Date(),
      ...(req.user ? { verifiedBy: order.user ?? undefined } : {}),
    },
    paidAt: new Date(),
  };
  order.paymentStatus = 'paid';
  if (order.orderStatus === 'pending') {
    order.orderStatus = 'confirmed';
    order.statusHistory.push({ status: 'confirmed', note: 'Bank transfer verified', at: new Date() });
  }
  await order.save();

  recordAudit({
    req,
    action: 'update',
    entity: 'Order',
    entityId: id,
    after: { paymentStatus: 'paid', method: 'bank_transfer_verified' },
  });

  sendSuccess(res, order.toJSON(), 'Payment verified and order confirmed');
}
