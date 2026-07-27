import {
  ProviderNotConfiguredError,
  type InitiateResult,
  type PaymentProvider,
  type VerifyResult,
  type WebhookResult,
} from './provider';

/**
 * Easypaisa adapter — STUB.
 *
 * Shape follows Easypaisa's Merchant Hosted Checkout: a signed redirect to
 * their portal, then a POST back to a postback URL.
 *
 * WHAT THE CLIENT MUST OBTAIN (see PAYMENTS.md):
 *   EASYPAISA_STORE_ID        — issued on merchant onboarding
 *   EASYPAISA_HASH_KEY        — for the request hash
 *   EASYPAISA_ACCOUNT_NUM     — the settlement account
 *   EASYPAISA_POSTBACK_URL    — must be whitelisted with Easypaisa
 *
 * As with JazzCash, every method throws until configured rather than
 * pretending a payment is pending.
 */

interface EasypaisaConfig {
  storeId: string;
  hashKey: string;
  postbackUrl: string;
}

function readConfig(): EasypaisaConfig | null {
  const { EASYPAISA_STORE_ID, EASYPAISA_HASH_KEY, EASYPAISA_POSTBACK_URL } = process.env;
  if (!EASYPAISA_STORE_ID || !EASYPAISA_HASH_KEY || !EASYPAISA_POSTBACK_URL) return null;

  return {
    storeId: EASYPAISA_STORE_ID,
    hashKey: EASYPAISA_HASH_KEY,
    postbackUrl: EASYPAISA_POSTBACK_URL,
  };
}

export const easypaisaProvider: PaymentProvider = {
  method: 'easypaisa',
  label: 'Easypaisa',
  get isConfigured(): boolean {
    return readConfig() !== null;
  },

  initiate(order): Promise<InitiateResult> {
    const config = readConfig();
    if (!config) throw new ProviderNotConfiguredError('Easypaisa');

    const expiry = new Date(Date.now() + 60 * 60 * 1000);
    const pad = (value: number): string => String(value).padStart(2, '0');

    return Promise.resolve({
      reference: order.orderNumber,
      redirectUrl: 'https://easypay.easypaisa.com.pk/easypay/Index.jsf',
      formFields: {
        storeId: config.storeId,
        amount: order.total.toFixed(2),
        postBackURL: config.postbackUrl,
        orderRefNum: order.orderNumber,
        // Easypaisa wants YYYYMMDD HHMMSS in local time.
        expiryDate: `${expiry.getFullYear()}${pad(expiry.getMonth() + 1)}${pad(expiry.getDate())} ${pad(expiry.getHours())}${pad(expiry.getMinutes())}${pad(expiry.getSeconds())}`,
        merchantHashedReq: '',
        autoRedirect: '1',
        paymentMethod: 'MA_PAYMENT_METHOD',
      },
    });
  },

  verify(): Promise<VerifyResult> {
    throw new ProviderNotConfiguredError('Easypaisa inquiry API');
  },

  handleWebhook(): Promise<WebhookResult> {
    throw new ProviderNotConfiguredError('Easypaisa postback handler');
  },
};
