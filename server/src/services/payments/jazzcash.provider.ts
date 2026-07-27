import { createHmac } from 'node:crypto';
import {
  ProviderNotConfiguredError,
  type InitiateResult,
  type PaymentProvider,
  type VerifyResult,
  type WebhookResult,
} from './provider';

/**
 * JazzCash adapter — STUB.
 *
 * The integration shape below matches JazzCash's Hosted Checkout (v2.0): the
 * merchant POSTs a signed form to their gateway, the customer authorises in
 * their app, and JazzCash POSTs back to a return URL with the same field set
 * plus a response code.
 *
 * WHAT THE CLIENT MUST OBTAIN (see PAYMENTS.md):
 *   JAZZCASH_MERCHANT_ID   — issued on merchant onboarding
 *   JAZZCASH_PASSWORD      — issued with the merchant id
 *   JAZZCASH_INTEGRITY_SALT — used for the HMAC-SHA256 request hash
 *   JAZZCASH_RETURN_URL    — must be whitelisted with JazzCash
 *
 * Every method throws until those exist. That is deliberate: a stub that
 * silently returns "pending" would let an order look payable when no money can
 * move, which is worse than an explicit failure.
 */

interface JazzCashConfig {
  merchantId: string;
  password: string;
  integritySalt: string;
  returnUrl: string;
}

function readConfig(): JazzCashConfig | null {
  const { JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD, JAZZCASH_INTEGRITY_SALT, JAZZCASH_RETURN_URL } =
    process.env;

  if (!JAZZCASH_MERCHANT_ID || !JAZZCASH_PASSWORD || !JAZZCASH_INTEGRITY_SALT || !JAZZCASH_RETURN_URL) {
    return null;
  }

  return {
    merchantId: JAZZCASH_MERCHANT_ID,
    password: JAZZCASH_PASSWORD,
    integritySalt: JAZZCASH_INTEGRITY_SALT,
    returnUrl: JAZZCASH_RETURN_URL,
  };
}

/**
 * JazzCash's secure hash: sort the populated fields by key, join the values
 * with `&` behind the salt, then HMAC-SHA256. Implemented now so the shape is
 * verifiable; it is only exercised once credentials exist.
 */
export function jazzCashSecureHash(fields: Record<string, string>, salt: string): string {
  const payload = Object.keys(fields)
    .sort()
    .filter((key) => fields[key] !== '' && key !== 'pp_SecureHash')
    .map((key) => fields[key])
    .join('&');

  return createHmac('sha256', salt).update(`${salt}&${payload}`).digest('hex').toUpperCase();
}

export const jazzCashProvider: PaymentProvider = {
  method: 'jazzcash',
  label: 'JazzCash',
  get isConfigured(): boolean {
    return readConfig() !== null;
  },

  initiate(order): Promise<InitiateResult> {
    const config = readConfig();
    if (!config) throw new ProviderNotConfiguredError('JazzCash');

    const now = new Date();
    const stamp = now.toISOString().replace(/\D/g, '').slice(0, 14);

    const fields: Record<string, string> = {
      pp_Version: '2.0',
      pp_TxnType: 'MWALLET',
      pp_Language: 'EN',
      pp_MerchantID: config.merchantId,
      pp_Password: config.password,
      pp_TxnRefNo: `T${stamp}${order.orderNumber.replace(/\D/g, '').slice(-6)}`,
      // JazzCash amounts are in paisa: Rs. 1 = 100.
      pp_Amount: String(Math.round(order.total * 100)),
      pp_TxnCurrency: 'PKR',
      pp_TxnDateTime: stamp,
      pp_BillReference: order.orderNumber,
      pp_Description: `Fast Traders order ${order.orderNumber}`,
      pp_ReturnURL: config.returnUrl,
    };
    fields.pp_SecureHash = jazzCashSecureHash(fields, config.integritySalt);

    return Promise.resolve({
      reference: fields.pp_TxnRefNo ?? '',
      redirectUrl: 'https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform',
      formFields: fields,
    });
  },

  verify(): Promise<VerifyResult> {
    throw new ProviderNotConfiguredError('JazzCash transaction status API');
  },

  handleWebhook(): Promise<WebhookResult> {
    throw new ProviderNotConfiguredError('JazzCash return handler');
  },
};
