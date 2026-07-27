import type { PaymentProvider } from './provider';

/**
 * Offline rails: cash on delivery and bank transfer.
 *
 * Neither talks to a gateway. They exist as providers so the checkout and the
 * order controller can treat every method uniformly rather than special-casing
 * two of the five.
 */

function offline(method: 'cod' | 'bank_transfer', label: string): PaymentProvider {
  return {
    method,
    label,
    isConfigured: true,

    initiate: (order) =>
      Promise.resolve({
        reference: `${method}_${order.orderNumber}`,
        settledOffline: true,
      }),

    // Nothing to poll — an admin marks these paid once the cash or the
    // transfer receipt actually arrives.
    verify: (reference) => Promise.resolve({ status: 'pending' as const, reference }),

    handleWebhook: () => Promise.resolve({ handled: false, event: `${method}.noop` }),
  };
}

export const codProvider = offline('cod', 'Cash on Delivery');
export const bankTransferProvider = offline('bank_transfer', 'Bank Transfer');
