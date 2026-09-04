import { Types } from 'mongoose';
import type { Request, Response } from 'express';
import * as list from '../services/inquiry-list.service';
import * as inquiries from '../services/inquiry.service';
import { uploadSourcingAttachments } from '../services/attachment.service';
import { verifyRecaptcha } from '../services/recaptcha.service';
import { ensureSessionId, readSessionId } from '../services/session.service';
import { ApiError } from '../utils/ApiError';
import { assessText, findRecentDuplicate } from '../services/spam-score.service';
import { sendCreated } from '../utils/ApiResponse';
import type { CreateInquiryInput, SourcingInquiryInput } from '../validators';

/**
 * Public inquiry submission.
 *
 * Both handlers answer with the inquiry number and nothing else worth
 * scraping. There is no public read endpoint — a buyer who wants to know
 * where their request stands phones, which is the whole premise of the
 * business.
 */

export async function createProductInquiry(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateInquiryInput;

  /*
   * The client's own shortlist wins.
   *
   * It lives in localStorage, which survives things the guest cookie does
   * not — a cleared cookie jar, a switch from the in-app browser to Chrome,
   * an ITP eviction. Trusting the server list alone means a buyer who spent
   * ten minutes shortlisting sends an empty inquiry and never finds out.
   *
   * Only the product id, quantity and note are taken from the body. Name,
   * SKU and brand are re-read from the database, so a tampered payload
   * cannot label a WAGO connector as a Terasaki ACB.
   */
  const sessionId = readSessionId(req);

  let entries: { product: Types.ObjectId; qty: number; note?: string }[] = [];

  if (input.items && input.items.length > 0) {
    entries = input.items.map((item) => ({
      product: new Types.ObjectId(item.product),
      qty: item.qty,
      ...(item.note ? { note: item.note } : {}),
    }));
  } else if (sessionId) {
    const shortlist = await list.getOrCreate(sessionId);
    entries = shortlist.items.map((item) => ({
      product: item.product,
      qty: item.qty,
      ...(item.note ? { note: item.note } : {}),
    }));
  }

  if (entries.length === 0) throw ApiError.badRequest('Your inquiry list is empty');

  const items = await inquiries.buildItemsFromList(entries);
  if (items.length === 0) {
    throw ApiError.badRequest('None of the items on your list are still available');
  }

  /*
   * A double-tapped submit button is far more common than an attack. Return
   * the original receipt instead of creating a second lead: the customer sees
   * a success they can trust, and Sharjeel gets one row to call rather than
   * two identical ones five seconds apart.
   */
  const duplicate = await findRecentDuplicate(
    input.customer.phone,
    entries.map((entry) => String(entry.product)),
  );

  if (duplicate) {
    sendCreated(
      res,
      { inquiryNumber: duplicate.inquiryNumber, itemCount: items.length },
      `Inquiry ${duplicate.inquiryNumber} received. We will call you within one working day.`,
    );
    return;
  }

  const spam = assessText(input.message);

  const inquiry = await inquiries.createInquiry({
    type: 'product_inquiry',
    customer: input.customer,
    items,
    ...(input.message ? { message: input.message } : {}),
    preferredContactMethod: input.preferredContactMethod,
    ...(input.preferredContactTime ? { preferredContactTime: input.preferredContactTime } : {}),
    provenance: inquiries.requestProvenance(req),
    spam,
  });

  // Clear the server copy too, so a later submission from the same session
  // cannot resend a list the customer believes they already sent.
  if (sessionId) await list.clear(sessionId);

  sendCreated(
    res,
    { inquiryNumber: inquiry.inquiryNumber, itemCount: items.length },
    `Inquiry ${inquiry.inquiryNumber} received. We will call you within one working day.`,
  );
}

/**
 * Sourcing request — "we will find it for you".
 *
 * The one endpoint that accepts files, because this is the request that
 * arrives as a photo. Somebody is standing in front of a failed breaker with
 * a nameplate they cannot read out over the phone; the picture *is* the
 * specification.
 *
 * A file that fails the signature check does not fail the request. The text is
 * the lead and the attachments are supporting evidence — losing an enquiry
 * because one of four files was an odd screenshot would be the wrong trade.
 * What was refused comes back in the reply so the customer can resend it.
 */
export async function createSourcingInquiry(req: Request, res: Response): Promise<void> {
  const input = req.body as SourcingInquiryInput & { recaptchaToken?: string };

  const verdict = await verifyRecaptcha(input.recaptchaToken, req.ip);
  if (!verdict.ok) {
    // Only reached when a configured reCAPTCHA actively rejected the token.
    // Same cheerful shape as the honeypot: a bot learns nothing from it.
    sendCreated(res, null, 'Thank you — we will be in touch shortly.');
    return;
  }

  const files = Array.isArray(req.files) ? req.files : [];
  const { files: referenceFiles, rejected } = await uploadSourcingAttachments(files);

  const flags = [
    verdict.suspicious ? '[flagged: low reCAPTCHA score]' : '',
    rejected.length > 0
      ? `[${rejected.length} attachment(s) refused: ${rejected.map((r) => `${r.name} — ${r.reason}`).join('; ')}]`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const message = [input.message, flags].filter(Boolean).join(' ');

  const inquiry = await inquiries.createInquiry({
    type: 'sourcing_request',
    customer: input.customer,
    sourcingDetails: { ...input.sourcingDetails, referenceFiles },
    ...(message ? { message } : {}),
    preferredContactMethod: input.preferredContactMethod,
    ...(input.preferredContactTime ? { preferredContactTime: input.preferredContactTime } : {}),
    provenance: inquiries.requestProvenance(req),
    // The item description carries most of the free text on this form, so it
    // is scored alongside the message.
    spam: assessText(message, input.sourcingDetails.itemDescription),
  });

  sendCreated(
    res,
    {
      inquiryNumber: inquiry.inquiryNumber,
      attachmentsAccepted: referenceFiles.length,
      attachmentsRejected: rejected,
    },
    `China sourcing request ${inquiry.inquiryNumber} received. We will call you to confirm the specification.`,
  );
}

/* ------------------------------ Inquiry list ----------------------------- */

/**
 * Every list route mints a session cookie if the visitor has none, so a
 * first-time buyer can add an item without any prior request.
 */
async function respond(req: Request, res: Response, sessionId: string, message: string): Promise<void> {
  const shortlist = await list.getOrCreate(sessionId);
  const summary = await list.hydrate(shortlist);
  res.status(200).json({ success: true, message, data: summary });
}

export async function getList(req: Request, res: Response): Promise<void> {
  const sessionId = ensureSessionId(req, res);
  await respond(req, res, sessionId, 'Your inquiry list');
}

export async function addListItem(req: Request, res: Response): Promise<void> {
  const sessionId = ensureSessionId(req, res);
  const { product, qty, note } = req.body as { product: string; qty: number; note?: string };

  await list.addItem(sessionId, { product, qty, ...(note ? { note } : {}) });
  await respond(req, res, sessionId, 'Added to your inquiry list');
}

export async function updateListItem(req: Request, res: Response): Promise<void> {
  const sessionId = ensureSessionId(req, res);
  const { product, qty, note } = req.body as { product: string; qty?: number; note?: string };

  await list.updateItem(sessionId, product, {
    ...(qty !== undefined ? { qty } : {}),
    ...(note !== undefined ? { note } : {}),
  });
  await respond(req, res, sessionId, 'List updated');
}

export async function removeListItem(req: Request, res: Response): Promise<void> {
  const sessionId = ensureSessionId(req, res);
  const { productId } = req.params as { productId: string };

  await list.removeItem(sessionId, productId);
  await respond(req, res, sessionId, 'Removed from your inquiry list');
}

export async function clearList(req: Request, res: Response): Promise<void> {
  const sessionId = ensureSessionId(req, res);

  await list.clear(sessionId);
  await respond(req, res, sessionId, 'Your inquiry list is now empty');
}
