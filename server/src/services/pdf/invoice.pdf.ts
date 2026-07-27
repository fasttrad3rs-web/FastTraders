import type { IOrder, ISetting } from '../../models';
import { createDocument, drawFooters, drawLetterhead, drawMetaPanel, toBuffer } from './layout';
import { drawNotes, drawTable, drawTotals, type TableRow } from './blocks';
import { COLORS, PAGE, amountInWords, formatDate, money } from './theme';

/** Tax invoice for a placed order, on the Fast Traders letterhead. */

const PAYMENT_LABELS: Record<string, string> = {
  cod: 'Cash on Delivery',
  bank_transfer: 'Bank Transfer',
  stripe: 'Card (Stripe)',
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
};

export interface InvoiceOptions {
  order: IOrder;
  settings?: Pick<ISetting, 'bankDetails' | 'defaultTaxRate'> | null;
}

export async function generateInvoicePdf({ order, settings }: InvoiceOptions): Promise<Buffer> {
  const doc = createDocument(`Invoice ${order.orderNumber}`, 'Tax invoice');
  const generatedAt = new Date();

  drawLetterhead(doc, 'Tax Invoice');

  const shipping = order.shippingAddress;
  const billing = order.billingAddress;

  drawMetaPanel(
    doc,
    {
      heading: 'Bill to',
      lines: [
        order.customer.name,
        ...(order.customer.companyName ? [order.customer.companyName] : []),
        billing.line1,
        ...(billing.line2 ? [billing.line2] : []),
        `${billing.city}, ${billing.province}`,
        order.customer.phone,
        order.customer.email,
      ],
    },
    {
      heading: 'Invoice details',
      lines: [
        `Invoice no.    ${order.orderNumber}`,
        `Date           ${formatDate(order.createdAt)}`,
        `Payment        ${PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}`,
        `Payment status ${order.paymentStatus.toUpperCase()}`,
        `Order status   ${order.orderStatus.toUpperCase()}`,
        ...(order.trackingNumber
          ? [`Tracking       ${order.courier ?? ''} ${order.trackingNumber}`.trim()]
          : []),
      ],
    },
  );

  // Ship-to only when it differs from bill-to, to keep the page uncluttered.
  if (!order.sameAsBilling) {
    drawMetaPanel(
      doc,
      {
        heading: 'Ship to',
        lines: [
          shipping.line1,
          ...(shipping.line2 ? [shipping.line2] : []),
          `${shipping.city}, ${shipping.province}`,
          ...(shipping.postalCode ? [shipping.postalCode] : []),
        ],
      },
      { heading: '', lines: [] },
    );
  }

  const rows: TableRow[] = order.items.map((item, index) => ({
    cells: [
      `${index + 1}.  ${item.name}`,
      `${item.qty} ${item.unit}`,
      money(item.price),
      money(item.subtotal),
    ],
    subLabel: `SKU ${item.sku}${item.variant ? `  ·  ${item.variant}` : ''}`,
  }));

  drawTable(
    doc,
    [
      { header: 'Description', width: 250 },
      { header: 'Qty', width: 70, align: 'center' },
      { header: 'Unit price', width: 90, align: 'right' },
      { header: 'Amount', width: PAGE.contentWidth - 410, align: 'right' },
    ],
    rows,
  );

  const taxRate = settings?.defaultTaxRate ?? 18;
  drawTotals(doc, [
    { label: 'Subtotal', value: money(order.subtotal) },
    ...(order.discount > 0
      ? [{ label: `Discount${order.couponCode ? ` (${order.couponCode})` : ''}`, value: `- ${money(order.discount)}` }]
      : []),
    ...(order.taxAmount > 0 ? [{ label: `Sales tax (${taxRate}%)`, value: money(order.taxAmount) }] : []),
    { label: 'Delivery', value: order.shippingCost > 0 ? money(order.shippingCost) : 'Free' },
    { label: 'Total payable', value: money(order.total), emphasise: true },
  ]);

  doc
    .font('Helvetica-Oblique')
    .fontSize(8.5)
    .fillColor(COLORS.muted)
    .text(`Amount in words: ${amountInWords(order.total)}`, PAGE.margin, doc.y, {
      width: PAGE.contentWidth,
    });
  doc.y += 16;

  const bank = settings?.bankDetails;
  drawNotes(doc, 'Payment & terms', [
    ...(bank
      ? [
          `Bank transfer: ${bank.bankName} — ${bank.accountTitle}, A/C ${bank.accountNumber}${bank.iban ? `, IBAN ${bank.iban}` : ''}`,
        ]
      : []),
    'Please quote the invoice number with any payment or correspondence.',
    'Goods remain the property of Fast Traders until payment is received in full.',
    'Claims for shortage or damage must be raised within 48 hours of delivery.',
    'Warranty is limited to the manufacturer’s terms for the relevant brand.',
    ...(order.notes ? [`Order note: ${order.notes}`] : []),
  ]);

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text('This is a computer-generated invoice and is valid without a signature.', PAGE.margin, doc.y, {
      width: PAGE.contentWidth,
      align: 'center',
    });

  drawFooters(doc, generatedAt);
  return toBuffer(doc);
}
