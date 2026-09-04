import { CONTACT } from '@/lib/constants';
import type { SourcingRequestFormValues } from '@/lib/forms';

/**
 * "Send on WhatsApp instead."
 *
 * Not a fallback for failure — a first choice for a lot of buyers here. A form
 * with four sections is a lot to fill in one-handed at a switchboard, and a
 * message that arrives on the counter phone gets answered faster than one that
 * lands in an inbox.
 *
 * Whatever has been typed so far is carried across, so switching channel does
 * not mean starting again. Attachments cannot come along — the Web Share API
 * cannot target a specific WhatsApp thread — so the message says the photos
 * are coming, which is what people do next anyway.
 */

const LABELS: Record<string, string> = {
  preferredBrand: 'Preferred brand',
  partNumber: 'Part number',
  specifications: 'Specifications',
  application: 'Application',
};

export function buildSourcingWhatsAppUrl(
  values: Partial<SourcingRequestFormValues>,
  attachmentCount = 0,
): string {
  const details = values.sourcingDetails;
  const customer = values.customer;

  const lines: string[] = ['Hi Fast Traders, I am looking for a part you may need to source.'];

  if (details?.itemDescription?.trim()) {
    lines.push('', details.itemDescription.trim());
  }

  const facts = Object.entries(LABELS)
    .map(([key, label]) => {
      const value = details?.[key as keyof typeof details];
      return typeof value === 'string' && value.trim() ? `${label}: ${value.trim()}` : null;
    })
    .filter((line): line is string => line !== null);

  if (details?.quantity) {
    facts.push(`Quantity: ${details.quantity} ${details.unit ?? 'piece'}`.trim());
  }
  if (details?.urgency === 'urgent') facts.push('Urgency: URGENT');
  if (details?.requiredBy) facts.push(`Needed by: ${details.requiredBy}`);
  if (details?.isRepeatRequirement) facts.push('This is a repeat requirement.');

  if (facts.length > 0) lines.push('', ...facts);

  const who = [customer?.name, customer?.company].filter(Boolean).join(', ');
  if (who) lines.push('', who);

  if (attachmentCount > 0) {
    lines.push(
      '',
      `I have ${attachmentCount} photo${attachmentCount === 1 ? '' : 's'}/document${
        attachmentCount === 1 ? '' : 's'
      } to send — attaching them now.`,
    );
  }

  return `https://wa.me/${CONTACT.whatsappDigits}?text=${encodeURIComponent(lines.join('\n'))}`;
}
