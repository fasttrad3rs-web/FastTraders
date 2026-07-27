import Stripe from 'stripe';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import type { IOrder } from '../../models';
import {
  ProviderNotConfiguredError,
  type InitiateResult,
  type PaymentProvider,
  type VerifyResult,
  type WebhookResult,
} from './provider';

/**
 * Stripe.
 *
 * PKR is a zero-decimal currency in Stripe's API, so amounts are sent as whole
 * rupees — multiplying by 100 the way you would for USD would overcharge every
 * customer a hundredfold.
 */

const ZERO_DECIMAL = true;

function toStripeAmount(rupees: number): number {
  return ZERO_DECIMAL ? Math.round(rupees) : Math.round(rupees * 100);
}

let client: Stripe | null = null;

function stripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY || env.STRIPE_SECRET_KEY.includes('replace_me')) {
    throw new ProviderNotConfiguredError('Stripe');
  }
  client ??= new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
  return client;
}

/** Events we act on. Anything else is acknowledged and ignored. */
const HANDLED_EVENTS = new Set([
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'charge.refunded',
]);

export const stripeProvider: PaymentProvider = {
  method: 'stripe',
  label: 'Card (Stripe)',
  get isConfigured(): boolean {
    return Boolean(env.STRIPE_SECRET_KEY) && !env.STRIPE_SECRET_KEY.includes('replace_me');
  },

  async initiate(order): Promise<InitiateResult> {
    const intent = await stripe().paymentIntents.create(
      {
        amount: toStripeAmount(order.total),
        currency: 'pkr',
        // The order id is the join key the webhook uses; without it a
        // succeeded event cannot be matched back to anything.
        metadata: { orderId: String(order._id), orderNumber: order.orderNumber },
        description: `Fast Traders order ${order.orderNumber}`,
        receipt_email: order.customer.email,
        automatic_payment_methods: { enabled: true },
      },
      // Stripe de-duplicates on this key, so a double-submit cannot create
      // two intents for one order.
      { idempotencyKey: `order_${String(order._id)}` },
    );

    return {
      reference: intent.id,
      ...(intent.client_secret ? { clientSecret: intent.client_secret } : {}),
    };
  },

  async verify(reference): Promise<VerifyResult> {
    const intent = await stripe().paymentIntents.retrieve(reference);

    const status: VerifyResult['status'] =
      intent.status === 'succeeded'
        ? 'paid'
        : intent.status === 'canceled'
          ? 'failed'
          : 'pending';

    return { status, reference: intent.id, amount: intent.amount };
  },

  async handleWebhook(rawBody, signature): Promise<WebhookResult> {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new ProviderNotConfiguredError('Stripe webhooks (STRIPE_WEBHOOK_SECRET)');
    }

    // Throws on a bad signature — the route lets that surface as a 400, which
    // is what Stripe expects and what stops forged payment confirmations.
    const event = stripe().webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);

    if (!HANDLED_EVENTS.has(event.type)) {
      logger.debug(`[stripe] Ignoring event ${event.type}`);
      return { handled: false, event: event.type };
    }

    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;
      const intentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : undefined;
      return {
        handled: true,
        event: event.type,
        ...(intentId ? { reference: intentId } : {}),
        ...(charge.metadata.orderId ? { orderId: charge.metadata.orderId } : {}),
        status: 'refunded',
      };
    }

    const intent = event.data.object as Stripe.PaymentIntent;
    return {
      handled: true,
      event: event.type,
      reference: intent.id,
      ...(intent.metadata.orderId ? { orderId: intent.metadata.orderId } : {}),
      status: event.type === 'payment_intent.succeeded' ? 'paid' : 'failed',
    };
  },
};

/** Exported for tests: converts rupees to the integer Stripe expects. */
export { toStripeAmount };
export type { IOrder };
