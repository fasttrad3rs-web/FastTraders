import type { IQuotation, ISetting } from '../../models';
import { createDocument, drawFooters, drawLetterhead, drawMetaPanel, toBuffer } from './layout';
import { drawNotes, drawTable, drawTotals, type TableRow } from './blocks';
import { COLORS, PAGE, amountInWords, formatDate, money } from './theme';

/** Formal quotation document emailed to the customer. */

export interface QuotationPdfOptions {
  quotation: IQuotation;
  settings?: Pick<ISetting, 'bankDetails' | 'defaultTaxRate'> | null;
}

export async function generateQuotationPdf({
  quotation,
  settings,
}: QuotationPdfOptions): Promise<Buffer> {
  const doc = createDocument(`Quotation ${quotation.quoteNumber}`, 'Quotation');
  const generatedAt = new Date();

  drawLetterhead(doc, 'Quotation');

  drawMetaPanel(
    doc,
    {
      heading: 'Quotation for',
      lines: [
        quotation.customer.name,
        ...(quotation.customer.companyName ? [quotation.customer.companyName] : []),
        ...(quotation.customer.city ? [quotation.customer.city] : []),
        quotation.customer.phone,
        quotation.customer.email,
      ],
    },
    {
      heading: 'Reference',
      lines: [
        `Quotation no.  ${quotation.quoteNumber}`,
        `Date           ${formatDate(quotation.createdAt)}`,
        ...(quotation.validUntil ? [`Valid until    ${formatDate(quotation.validUntil)}`] : []),
        ...(quotation.requiredBy ? [`Required by    ${formatDate(quotation.requiredBy)}`] : []),
        `Status         ${quotation.status.toUpperCase()}`,
      ],
    },
  );

  const priced = quotation.items.some((item) => typeof item.quotedUnitPrice === 'number');

  const rows: TableRow[] = quotation.items.map((item, index) => ({
    cells: [
      `${index + 1}.  ${item.name}`,
      `${item.qty} ${item.unit}`,
      typeof item.quotedUnitPrice === 'number' ? money(item.quotedUnitPrice) : 'On request',
      typeof item.quotedTotal === 'number' ? money(item.quotedTotal) : '—',
    ],
    subLabel: [`SKU ${item.sku}`, item.customerNote].filter(Boolean).join('  ·  '),
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

  if (priced && typeof quotation.quotedTotal === 'number') {
    const taxRate = settings?.defaultTaxRate ?? 18;
    drawTotals(doc, [
      { label: 'Subtotal', value: money(quotation.quotedSubtotal ?? 0) },
      ...(quotation.quotedTax
        ? [{ label: `Sales tax (${taxRate}%)`, value: money(quotation.quotedTax) }]
        : []),
      { label: 'Quoted total', value: money(quotation.quotedTotal), emphasise: true },
    ]);

    doc
      .font('Helvetica-Oblique')
      .fontSize(8.5)
      .fillColor(COLORS.muted)
      .text(`Amount in words: ${amountInWords(quotation.quotedTotal)}`, PAGE.margin, doc.y, {
        width: PAGE.contentWidth,
      });
    doc.y += 16;
  } else {
    doc
      .font('Helvetica-Oblique')
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text(
        'Pricing for the items above is being confirmed with our principals and will follow shortly.',
        PAGE.margin,
        doc.y,
        { width: PAGE.contentWidth },
      );
    doc.y += 18;
  }

  if (quotation.message) {
    drawNotes(doc, 'Your enquiry', [quotation.message]);
  }

  const bank = settings?.bankDetails;
  drawNotes(doc, 'Terms of quotation', [
    quotation.validUntil
      ? `This quotation is valid until ${formatDate(quotation.validUntil)}.`
      : 'This quotation is valid for 15 days from the date above.',
    'Prices are subject to stock availability at the time of order confirmation.',
    'Imported items are quoted against the prevailing exchange rate and may be revised.',
    'Delivery lead time is confirmed on receipt of a firm order.',
    'Warranty is limited to the manufacturer’s terms for the relevant brand.',
    ...(bank
      ? [`Payment: ${bank.bankName} — ${bank.accountTitle}, A/C ${bank.accountNumber}`]
      : []),
    ...(quotation.adminNotes ? [`Note: ${quotation.adminNotes.split('\n')[0] ?? ''}`] : []),
  ]);

  // Signature block — trade customers routinely need a countersigned copy.
  if (doc.y < 690) {
    const y = Math.max(doc.y + 10, 700);
    doc
      .moveTo(PAGE.margin, y)
      .lineTo(PAGE.margin + 170, y)
      .strokeColor(COLORS.line)
      .lineWidth(0.7)
      .stroke();
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text('For Fast Traders', PAGE.margin, y + 5);

    const rightX = PAGE.margin + PAGE.contentWidth - 170;
    doc
      .moveTo(rightX, y)
      .lineTo(rightX + 170, y)
      .stroke();
    doc.text('Customer acceptance (sign & date)', rightX, y + 5, { width: 170 });
  }

  drawFooters(doc, generatedAt);
  return toBuffer(doc);
}
