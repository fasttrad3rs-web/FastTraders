import { CONTACT, SITE } from './constants';
import { detailRows, itemsTable, renderEmail } from './layout';
import { formatPakistaniPhone, toWhatsAppNumber } from '../../utils/phone';
import type { EmailContent } from './templates.auth';
import type { IInquiry } from '../../models';
import type { ReferenceFile } from '../../types';

/**
 * Inquiry notifications.
 *
 * Two templates with opposite jobs. The admin alert is a working document —
 * every field, nothing summarised, reply buttons at the top. The customer
 * acknowledgement is a receipt, and goes out only when we were given an
 * address to send one to.
 */

const TYPE_LABELS: Record<string, string> = {
  product_inquiry: 'Product inquiry',
  sourcing_request: 'China sourcing request',
  general: 'General enquiry',
};

const URGENCY_LABELS: Record<string, string> = {
  standard: 'Standard',
  urgent: 'Urgent',
};

/** Drop empty rows so the table does not fill up with dashes. */
function rows(pairs: [string, string | undefined | null][]): { label: string; value: string }[] {
  return pairs
    .filter((pair): pair is [string, string] => Boolean(pair[1]))
    .map(([label, value]) => ({ label, value }));
}

/**
 * Tel and WhatsApp links, because this is read on a phone and the next action
 * is always a call. A stated preference puts that channel first.
 */
function contactBlock(inquiry: IInquiry): string {
  const wa = toWhatsAppNumber(inquiry.customer.whatsapp ?? inquiry.customer.phone);

  const call = `<a href="tel:${inquiry.customer.phone}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 16px;background:#1B2A6B;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;">Call ${formatPakistaniPhone(inquiry.customer.phone)}</a>`;
  const whatsapp = wa
    ? `<a href="https://wa.me/${wa}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 16px;background:#25D366;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;">WhatsApp</a>`
    : '';
  const mail = inquiry.customer.email
    ? `<a href="mailto:${inquiry.customer.email}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 16px;background:#00AEEF;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;">Email</a>`
    : '';

  return inquiry.preferredContactMethod === 'whatsapp'
    ? `${whatsapp}${call}${mail}`
    : `${call}${whatsapp}${mail}`;
}

function sourcingBlock(inquiry: IInquiry): string {
  const details = inquiry.sourcingDetails;
  if (!details) return '';

  return `
    <h3 style="font-size:15px;color:#1B2A6B;margin:24px 0 8px;">What they are looking for</h3>
    <p style="background:#F7F9FC;padding:12px;border-radius:6px;font-size:14px;white-space:pre-wrap;">${details.itemDescription}</p>
    ${detailRows(
      rows([
        ['Preferred brand', details.preferredBrand],
        ['Part number', details.partNumber],
        ['Specifications', details.specifications],
        [
          'Quantity',
          details.quantity ? `${details.quantity} ${details.unit ?? ''}`.trim() : undefined,
        ],
        ['Needed by', details.targetDate?.toISOString().slice(0, 10)],
        ['Urgency', details.urgency ? URGENCY_LABELS[details.urgency] : undefined],
        ['Repeat requirement', details.isRepeatRequirement ? 'Yes — recurring need' : undefined],
        ['Application', details.application],
      ]),
    )}
    ${attachmentBlock(details.referenceFiles)}`;
}

/**
 * Attachment links, with photos shown inline.
 *
 * A filename is useless here: the nameplate photo *is* the specification, and
 * staff read this on a phone at the counter. Images are embedded so the part
 * number can be read without leaving the mail app; documents are links, since
 * a datasheet has to be opened anyway.
 */
function attachmentBlock(files: ReferenceFile[]): string {
  if (files.length === 0) return '';

  const isPhoto = (file: ReferenceFile): boolean => file.type.startsWith('image/');

  const items = files
    .map((file) => {
      const link = `<a href="${file.url}" style="color:#00AEEF;font-size:13px;word-break:break-all;">${file.name}</a>`;
      if (!isPhoto(file)) {
        return `<li style="margin-bottom:8px;">📎 ${link}</li>`;
      }
      return `<li style="margin-bottom:14px;">
        ${link}<br>
        <a href="${file.url}"><img src="${file.url}" alt="${file.name}" style="margin-top:6px;max-width:280px;height:auto;border:1px solid #E5E9F0;border-radius:6px;"></a>
      </li>`;
    })
    .join('');

  return `
    <h3 style="font-size:15px;color:#1B2A6B;margin:24px 0 8px;">
      Attachments (${files.length})
    </h3>
    <ul style="list-style:none;padding:0;margin:0;">${items}</ul>`;
}

/** The admin alert: everything, in one screen, reply buttons first. */
export function newInquiryAlertEmail(inquiry: IInquiry, adminUrl: string): EmailContent {
  const typeLabel = TYPE_LABELS[inquiry.type] ?? inquiry.type;
  const urgent = inquiry.sourcingDetails?.urgency === 'urgent';

  const subject = `${urgent ? '[URGENT] ' : ''}${typeLabel}: ${inquiry.customer.name}${
    inquiry.customer.company ? ` (${inquiry.customer.company})` : ''
  } — ${inquiry.inquiryNumber}`;

  return {
    subject,
    html: renderEmail({
      title: `New ${typeLabel.toLowerCase()}`,
      preheader: `${inquiry.customer.name} — ${formatPakistaniPhone(inquiry.customer.phone)}`,
      body: `
        <div style="margin-bottom:16px;">${contactBlock(inquiry)}</div>
        ${detailRows(
          rows([
            ['Reference', inquiry.inquiryNumber],
            ['Name', inquiry.customer.name],
            ['Phone', formatPakistaniPhone(inquiry.customer.phone)],
            [
              'WhatsApp',
              inquiry.customer.whatsapp
                ? formatPakistaniPhone(inquiry.customer.whatsapp)
                : undefined,
            ],
            ['Email', inquiry.customer.email],
            ['Company', inquiry.customer.company],
            ['Designation', inquiry.customer.designation],
            ['City', inquiry.customer.city],
            ['Prefers', inquiry.preferredContactMethod],
            ['Best time', inquiry.preferredContactTime],
            ['Source', inquiry.source],
          ]),
        )}
        ${
          inquiry.items.length > 0
            ? `<h3 style="font-size:15px;color:#1B2A6B;margin:24px 0 8px;">Items</h3>${itemsTable(
                inquiry.items.map((item) => ({
                  name: `${item.name}${item.note ? ` — ${item.note}` : ''}`,
                  sku: item.sku,
                  qty: item.qty,
                })),
              )}`
            : ''
        }
        ${sourcingBlock(inquiry)}
        ${
          inquiry.message
            ? `<h3 style="font-size:15px;color:#1B2A6B;margin:24px 0 8px;">Their message</h3>
               <p style="background:#F7F9FC;padding:12px;border-radius:6px;font-size:14px;white-space:pre-wrap;">${inquiry.message}</p>`
            : ''
        }`,
      cta: { label: 'Open in admin', url: adminUrl },
    }),
    text: [
      `${typeLabel} ${inquiry.inquiryNumber}`,
      `${inquiry.customer.name}${inquiry.customer.company ? ` (${inquiry.customer.company})` : ''}`,
      `Phone: ${formatPakistaniPhone(inquiry.customer.phone)}`,
      inquiry.customer.email ? `Email: ${inquiry.customer.email}` : '',
      inquiry.customer.city ? `City: ${inquiry.customer.city}` : '',
      inquiry.items.length > 0
        ? `Items: ${inquiry.items.map((item) => `${item.sku} x${item.qty}`).join(', ')}`
        : '',
      inquiry.sourcingDetails ? `Looking for: ${inquiry.sourcingDetails.itemDescription}` : '',
      inquiry.message ? `Message: ${inquiry.message}` : '',
      adminUrl,
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

/**
 * Customer acknowledgement. Only sent when an email address was given.
 *
 * It promises a call, not a written quotation — that is what actually
 * happens, and setting the other expectation makes the follow-up feel like a
 * failure.
 */
export function inquiryReceivedEmail(inquiry: IInquiry): EmailContent {
  return {
    subject: `We have your inquiry — ${inquiry.inquiryNumber}`,
    html: renderEmail({
      title: 'Thank you — we have your inquiry',
      preheader: `Reference ${inquiry.inquiryNumber}. We will call you shortly.`,
      body: `<p>Hello ${inquiry.customer.name},</p>
        <p>Thank you for getting in touch. One of our team will call you on
        <strong>${formatPakistaniPhone(inquiry.customer.phone)}</strong> within one working day
        to confirm availability and pricing.</p>
        ${detailRows([{ label: 'Your reference', value: inquiry.inquiryNumber }])}
        ${
          inquiry.items.length > 0
            ? itemsTable(
                inquiry.items.map((item) => ({ name: item.name, sku: item.sku, qty: item.qty })),
              )
            : ''
        }
        ${
          inquiry.sourcingDetails
            ? `<p style="background:#F7F9FC;padding:12px;border-radius:6px;font-size:14px;white-space:pre-wrap;"><strong>Your requirement:</strong><br>${inquiry.sourcingDetails.itemDescription}</p>`
            : ''
        }
        <p style="font-size:14px;color:#5A6472;">In a hurry? Call
        <a href="tel:${CONTACT.mobile.replace(/\s/g, '')}">${CONTACT.mobile}</a>
        or message the same number on WhatsApp.</p>`,
    }),
    text: `Hello ${inquiry.customer.name}, we have your inquiry ${inquiry.inquiryNumber} and will call you on ${formatPakistaniPhone(inquiry.customer.phone)} within one working day. Urgent? Call ${CONTACT.mobile}.`,
  };
}

/* ------------------------------ Contact form ----------------------------- */

export function contactAlertEmail(data: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  source: string;
}): EmailContent {
  return {
    subject: `Contact form: ${data.subject}`,
    html: renderEmail({
      title: 'New contact form submission',
      preheader: `${data.name} — ${data.subject}`,
      body: `${detailRows(
        rows([
          ['Name', data.name],
          ['Email', data.email],
          ['Phone', data.phone ? formatPakistaniPhone(data.phone) : undefined],
          ['Subject', data.subject],
          ['Source', data.source],
        ]),
      )}
      <p style="background:#F7F9FC;padding:12px;border-radius:6px;font-size:14px;white-space:pre-wrap;">${data.message}</p>`,
    }),
    text: `${data.name} <${data.email}>\n${data.subject}\n\n${data.message}`,
  };
}

/** The canonical admin deep-link for an inquiry. */
export function adminInquiryUrl(id: string): string {
  return `${SITE.url}/admin/inquiries/${id}`;
}
