import { CONTACT, SITE } from './constants';

/**
 * Shared HTML shell for every transactional email.
 *
 * Table-based and inline-styled on purpose: Gmail, Outlook and most Pakistani
 * webmail clients strip <style> blocks and ignore flexbox.
 */

const NAVY = '#1B2A6B';
const DARK = '#0F1B4C';
const CYAN = '#00AEEF';
const SURFACE = '#F7F9FC';
const INK = '#1A1A1A';
const MUTED = '#5A6472';

export interface LayoutOptions {
  title: string;
  preheader: string;
  body: string;
  cta?: { label: string; url: string };
}

export function button(label: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td style="background:${CYAN};border-radius:6px;">
        <a href="${url}" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">${label}</a>
      </td></tr>
    </table>`;
}

/** Key/value block used by order and quotation emails. */
export function detailRows(rows: { label: string; value: string }[]): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;">
    ${rows
      .map(
        ({ label, value }) => `<tr>
        <td style="padding:6px 0;color:${MUTED};width:45%;">${label}</td>
        <td style="padding:6px 0;color:${INK};font-weight:bold;">${value}</td>
      </tr>`,
      )
      .join('')}
  </table>`;
}

/** Line-item table used by order and quotation emails. */
export function itemsTable(
  items: { name: string; sku: string; qty: number; amount?: string }[],
): string {
  const header = `<tr style="background:${SURFACE};">
      <th align="left" style="padding:10px;font-size:12px;color:${MUTED};text-transform:uppercase;">Item</th>
      <th align="center" style="padding:10px;font-size:12px;color:${MUTED};text-transform:uppercase;">Qty</th>
      ${items.some((i) => i.amount) ? `<th align="right" style="padding:10px;font-size:12px;color:${MUTED};text-transform:uppercase;">Amount</th>` : ''}
    </tr>`;

  const rows = items
    .map(
      (item) => `<tr style="border-bottom:1px solid #E5E9F0;">
      <td style="padding:10px;font-size:14px;color:${INK};">${item.name}<br><span style="font-size:12px;color:${MUTED};">SKU: ${item.sku}</span></td>
      <td align="center" style="padding:10px;font-size:14px;color:${INK};">${item.qty}</td>
      ${item.amount ? `<td align="right" style="padding:10px;font-size:14px;color:${INK};">${item.amount}</td>` : ''}
    </tr>`,
    )
    .join('');

  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;">${header}${rows}</table>`;
}

export function renderEmail({ title, preheader, body, cta }: LayoutOptions): string {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:${SURFACE};">
<span style="display:none;font-size:1px;color:${SURFACE};max-height:0;overflow:hidden;">${preheader}</span>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${SURFACE};padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(27,42,107,0.08);">

      <tr><td style="background:linear-gradient(135deg,${DARK},${NAVY});background-color:${NAVY};padding:28px 32px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:0.5px;">FAST TRADERS</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${CYAN};margin-top:4px;">${SITE.tagline}</div>
      </td></tr>

      <tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${INK};">
        <h1 style="margin:0 0 16px;font-size:20px;color:${NAVY};">${title}</h1>
        ${body}
        ${cta ? button(cta.label, cta.url) : ''}
      </td></tr>

      <tr><td style="background:${SURFACE};padding:24px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:${MUTED};">
        <strong style="color:${NAVY};">Fast Traders</strong><br>
        ${CONTACT.address}<br>
        Mobile / WhatsApp: <a href="tel:${CONTACT.mobile.replace(/\s/g, '')}" style="color:${NAVY};">${CONTACT.mobile}</a> &nbsp;·&nbsp;
        Landline: <a href="tel:${CONTACT.landline.replace(/\s/g, '')}" style="color:${NAVY};">${CONTACT.landline}</a><br>
        <a href="mailto:${CONTACT.email}" style="color:${NAVY};">${CONTACT.email}</a> &nbsp;·&nbsp;
        <a href="${SITE.url}" style="color:${NAVY};">${SITE.domain}</a>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}
