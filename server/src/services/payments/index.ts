import { ApiError } from '../../utils/ApiError';
import { bankTransferProvider, codProvider } from './offline.provider';
import { easypaisaProvider } from './easypaisa.provider';
import { jazzCashProvider } from './jazzcash.provider';
import { stripeProvider } from './stripe.provider';
import type { PaymentMethod, PaymentProvider } from './provider';

/** Provider registry. One place to look when adding a rail. */
const PROVIDERS: Record<PaymentMethod, PaymentProvider> = {
  cod: codProvider,
  bank_transfer: bankTransferProvider,
  stripe: stripeProvider,
  jazzcash: jazzCashProvider,
  easypaisa: easypaisaProvider,
};

export function getProvider(method: PaymentMethod): PaymentProvider {
  const provider = PROVIDERS[method];
  if (!provider) throw ApiError.badRequest(`Unknown payment method "${method}"`);
  return provider;
}

/** What the storefront should offer. Unconfigured rails render disabled. */
export function listProviders(): { method: PaymentMethod; label: string; isConfigured: boolean }[] {
  return Object.values(PROVIDERS).map((provider) => ({
    method: provider.method,
    label: provider.label,
    isConfigured: provider.isConfigured,
  }));
}

export * from './provider';
export { stripeProvider, codProvider, bankTransferProvider, jazzCashProvider, easypaisaProvider };
export { jazzCashSecureHash } from './jazzcash.provider';
export { toStripeAmount } from './stripe.provider';
