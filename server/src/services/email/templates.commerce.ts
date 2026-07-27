import { SITE, formatPKR } from './constants';
import { detailRows, itemsTable, renderEmail } from './layout';
import type { EmailContent } from './templates.auth';

/** Order, quotation and enquiry emails. */

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  items: { name: string; sku: string; qty: number; price: number }[];
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discount: number;
  total: number;
  paymentMethod: string;
  shippingCity: string;
}

const PAYMENT_LABELS: Record<string, string> = {
  cod: 'Cash on Delivery',
  bank_transfer: 'Bank Transfer',
  stripe: 'Card (Stripe)',
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
};

function orderTotals(data: OrderEmailData): { label: string; value: string }[] {
  const rows = [{ label: 'Subtotal', value: formatPKR(data.subtotal) }];
  if (data.discount > 0) rows.push({ label: 'Discount', value: `− ${formatPKR(data.discount)}` });
  if (data.taxAmount > 0) rows.push({ label: 'Sales tax', value: formatPKR(data.taxAmount) });
  rows.push({ label: 'Delivery', value: data.shippingCost > 0 ? formatPKR(data.shippingCost) : 'Free' });
  rows.push({ label: 'Total payable', value: formatPKR(data.total) });
  return rows;
}

export function orderConfirmationEmail(data: OrderEmailData): EmailContent {
  const items = data.items.map((item) => ({
    name: item.name,
    sku: item.sku,
    qty: item.qty,
    amount: formatPKR(item.price * item.qty),
  }));

  return {
    subject: `Order ${data.orderNumber} confirmed — Fast Traders`,
    html: renderEmail({
      title: `Thank you, ${data.customerName}`,
      preheader: `We have received order ${data.orderNumber}.`,
      body: `<p>We have received your order and our team is preparing it now.
        You will get another email as soon as it ships.</p>
        ${detailRows([
          { label: 'Order number', value: data.orderNumber },
          { label: 'Payment method', value: PAYMENT_LABELS[data.paymentMethod] ?? data.paymentMethod },
          { label: 'Delivering to', value: data.shippingCity },
        ])}
        ${itemsTable(items)}
        ${detailRows(orderTotals(data))}
        <p style="font-size:13px;color:#5A6472;">Questions about this order?
        WhatsApp +92 324 4234990 and quote your order number.</p>`,
      cta: { label: 'View your order', url: `${SITE.url}/orders/${data.orderNumber}` },
    }),
    text: `Thank you, ${data.customerName}. Order ${data.orderNumber} confirmed. Total ${formatPKR(data.total)}. Track it at ${SITE.url}/orders/${data.orderNumber}`,
  };
}

export function newOrderAlertEmail(data: OrderEmailData & { customerPhone: string; customerEmail: string }): EmailContent {
  const items = data.items.map((item) => ({
    name: item.name,
    sku: item.sku,
    qty: item.qty,
    amount: formatPKR(item.price * item.qty),
  }));

  return {
    subject: `NEW ORDER ${data.orderNumber} — ${formatPKR(data.total)}`,
    html: renderEmail({
      title: `New order: ${data.orderNumber}`,
      preheader: `${data.customerName} — ${formatPKR(data.total)}`,
      body: `${detailRows([
        { label: 'Customer', value: data.customerName },
        { label: 'Phone', value: data.customerPhone },
        { label: 'Email', value: data.customerEmail },
        { label: 'City', value: data.shippingCity },
        { label: 'Payment', value: PAYMENT_LABELS[data.paymentMethod] ?? data.paymentMethod },
      ])}
      ${itemsTable(items)}
      ${detailRows(orderTotals(data))}`,
      cta: { label: 'Open in admin', url: `${SITE.url}/admin/orders/${data.orderNumber}` },
    }),
    text: `New order ${data.orderNumber} from ${data.customerName} (${data.customerPhone}) — ${formatPKR(data.total)}.`,
  };
}

export interface QuotationEmailData {
  quoteNumber: string;
  customerName: string;
  items: { name: string; sku: string; qty: number }[];
  message?: string;
}

export function quotationReceivedEmail(data: QuotationEmailData): EmailContent {
  return {
    subject: `We received your quotation request ${data.quoteNumber}`,
    html: renderEmail({
      title: 'Your request is with our team',
      preheader: `Quotation request ${data.quoteNumber} received.`,
      body: `<p>Hello ${data.customerName},</p>
        <p>Thank you for your enquiry. Our team is checking stock and pricing,
        and will send your quotation within one working day.</p>
        ${detailRows([{ label: 'Reference', value: data.quoteNumber }])}
        ${itemsTable(data.items)}
        ${data.message ? `<p style="background:#F7F9FC;padding:12px;border-radius:6px;font-size:14px;"><strong>Your note:</strong><br>${data.message}</p>` : ''}`,
      cta: { label: 'View your request', url: `${SITE.url}/quotations/${data.quoteNumber}` },
    }),
    text: `Hello ${data.customerName}, we received quotation request ${data.quoteNumber} and will respond within one working day.`,
  };
}

export function quotationReadyEmail(
  data: QuotationEmailData & { total: number; validUntil?: string },
): EmailContent {
  return {
    subject: `Your quotation ${data.quoteNumber} is ready — Fast Traders`,
    html: renderEmail({
      title: 'Your quotation is ready',
      preheader: `Quotation ${data.quoteNumber}: ${formatPKR(data.total)}`,
      body: `<p>Hello ${data.customerName},</p>
        <p>We have priced your request. Review it below and accept online, or
        reply with a counter-offer and we will take another look.</p>
        ${detailRows([
          { label: 'Reference', value: data.quoteNumber },
          { label: 'Quoted total', value: formatPKR(data.total) },
          ...(data.validUntil ? [{ label: 'Valid until', value: data.validUntil }] : []),
        ])}
        ${itemsTable(data.items)}`,
      cta: { label: 'Review the quotation', url: `${SITE.url}/quotations/${data.quoteNumber}` },
    }),
    text: `Hello ${data.customerName}, quotation ${data.quoteNumber} is ready — ${formatPKR(data.total)}. Review it at ${SITE.url}/quotations/${data.quoteNumber}`,
  };
}

export function newQuotationAlertEmail(
  data: QuotationEmailData & { customerPhone: string; customerEmail: string; company?: string },
): EmailContent {
  return {
    subject: `NEW RFQ ${data.quoteNumber} — ${data.items.length} line(s)`,
    html: renderEmail({
      title: `New quotation request: ${data.quoteNumber}`,
      preheader: `${data.customerName} requested a quotation.`,
      body: `${detailRows([
        { label: 'Customer', value: data.customerName },
        ...(data.company ? [{ label: 'Company', value: data.company }] : []),
        { label: 'Phone', value: data.customerPhone },
        { label: 'Email', value: data.customerEmail },
      ])}
      ${itemsTable(data.items)}
      ${data.message ? `<p style="background:#F7F9FC;padding:12px;border-radius:6px;"><strong>Note:</strong><br>${data.message}</p>` : ''}`,
      cta: { label: 'Price this RFQ', url: `${SITE.url}/admin/quotations/${data.quoteNumber}` },
    }),
    text: `New RFQ ${data.quoteNumber} from ${data.customerName} (${data.customerPhone}), ${data.items.length} line(s).`,
  };
}

export function contactAlertEmail(data: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  source: string;
}): EmailContent {
  return {
    subject: `Website enquiry: ${data.subject}`,
    html: renderEmail({
      title: 'New website enquiry',
      preheader: `${data.name}: ${data.subject}`,
      body: `${detailRows([
        { label: 'Name', value: data.name },
        { label: 'Email', value: data.email },
        ...(data.phone ? [{ label: 'Phone', value: data.phone }] : []),
        { label: 'Source', value: data.source },
      ])}
      <p style="background:#F7F9FC;padding:14px;border-radius:6px;white-space:pre-wrap;">${data.message}</p>`,
    }),
    text: `Website enquiry from ${data.name} (${data.email}): ${data.subject}\n\n${data.message}`,
  };
}

/* --------------------------- Order status update -------------------------- */

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  confirmed: { title: 'Your order is confirmed', body: 'We have confirmed your order and are preparing it for dispatch.' },
  processing: { title: 'Your order is being prepared', body: 'Our team is picking and checking your items now.' },
  shipped: { title: 'Your order is on its way', body: 'Your order has left our Bull Road counter and is with the courier.' },
  delivered: { title: 'Your order has been delivered', body: 'Your order is marked as delivered. We hope everything arrived in good order.' },
  cancelled: { title: 'Your order has been cancelled', body: 'This order has been cancelled and any reserved stock released.' },
  returned: { title: 'Your return has been recorded', body: 'We have recorded the return against this order.' },
  pending: { title: 'Your order has been received', body: 'We have your order and will confirm it shortly.' },
};

export function orderStatusEmail(data: {
  orderNumber: string;
  customerName: string;
  status: string;
  note?: string;
  trackingNumber?: string;
  courier?: string;
}): EmailContent {
  const copy = STATUS_COPY[data.status] ?? {
    title: 'Update on your order',
    body: `Your order status is now "${data.status}".`,
  };

  return {
    subject: `${copy.title} — ${data.orderNumber}`,
    html: renderEmail({
      title: copy.title,
      preheader: `${data.orderNumber}: ${data.status}`,
      body: `<p>Hello ${data.customerName},</p>
        <p>${copy.body}</p>
        ${detailRows([
          { label: 'Order number', value: data.orderNumber },
          { label: 'Status', value: data.status.toUpperCase() },
          ...(data.courier ? [{ label: 'Courier', value: data.courier }] : []),
          ...(data.trackingNumber ? [{ label: 'Tracking number', value: data.trackingNumber }] : []),
        ])}
        ${data.note ? `<p style="background:#F7F9FC;padding:12px;border-radius:6px;"><strong>Note from our team:</strong><br>${data.note}</p>` : ''}
        <p style="font-size:13px;color:#5A6472;">Questions? WhatsApp +92 324 4234990 and quote your order number.</p>`,
      cta: { label: 'View your order', url: `${SITE.url}/orders/${data.orderNumber}` },
    }),
    text: `Hello ${data.customerName}, order ${data.orderNumber} is now ${data.status}.${data.trackingNumber ? ` Tracking: ${data.courier ?? ''} ${data.trackingNumber}.` : ''}`,
  };
}
