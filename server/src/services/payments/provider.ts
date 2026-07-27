import type { IOrder } from '../../models';

/**
 * Payment provider contract.
 *
 * Every rail — Stripe today, JazzCash and Easypaisa once contracted —
 * implements this. Controllers depend on the interface, never on a specific
 * gateway, so adding a provider is a new file plus a registry entry.
 */

export type PaymentMethod = 'cod' | 'bank_transfer' | 'stripe' | 'jazzcash' | 'easypaisa';

/** What the client needs to complete the payment, if anything. */
export interface InitiateResult {
  /** Provider-side reference, stored on the order for reconciliation. */
  reference: string;
  /** Stripe returns a client secret; hosted-redirect rails return a URL. */
  clientSecret?: string;
  redirectUrl?: string;
  /** Fields a hosted form must POST, for rails that work that way. */
  formFields?: Record<string, string>;
  /** True when nothing further is required (COD, bank transfer). */
  settledOffline?: boolean;
}

export interface VerifyResult {
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  reference: string;
  amount?: number;
  raw?: Record<string, unknown>;
}

/** Normalised webhook outcome, so the handler never branches on provider. */
export interface WebhookResult {
  /** Ignorable events return `handled: false` and are acknowledged with 200. */
  handled: boolean;
  event: string;
  orderId?: string;
  reference?: string;
  status?: VerifyResult['status'];
}

export interface PaymentProvider {
  readonly method: PaymentMethod;
  readonly label: string;
  /** False until the client has credentials; the checkout greys it out. */
  readonly isConfigured: boolean;

  initiate(order: IOrder & { _id: unknown }): Promise<InitiateResult>;
  verify(reference: string): Promise<VerifyResult>;
  /**
   * Parse and authenticate an inbound webhook.
   * `rawBody` must be the untouched buffer — signature schemes hash the exact
   * bytes, so a JSON round trip invalidates them.
   */
  handleWebhook(rawBody: Buffer, signature: string): Promise<WebhookResult>;
}

/** Thrown when a provider is selected but not yet contracted. */
export class ProviderNotConfiguredError extends Error {
  constructor(label: string) {
    super(
      `${label} is not configured yet. Add its credentials to the server environment, ` +
        `then enable it in admin settings.`,
    );
    this.name = 'ProviderNotConfiguredError';
  }
}
