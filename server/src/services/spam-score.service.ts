import { Inquiry } from '../models';

/**
 * Spam heuristics that FLAG, never delete.
 *
 * That distinction is the whole design. Fast Traders sells industrial parts to
 * Pakistani panel builders, and a real inquiry can easily read like spam to a
 * naive filter: all-caps part numbers, a bare phone number and no sentence, a
 * link to a supplier datasheet, the word "loan" from somebody buying breakers
 * for a bank fit-out. Silently binning one of those costs a sale that Sharjeel
 * will never know he lost. Showing it in the admin list with a flag costs him
 * two seconds.
 *
 * So nothing here rejects a request. It attaches a score and reasons, and the
 * inquiry list sorts flagged items separately.
 */

/**
 * Terms from the spam that actually reaches small business contact forms:
 * SEO and backlink pitches, crypto, and loan offers.
 *
 * Deliberately narrow. `seo` alone would match "seoul"; `rank` alone matches
 * nothing useful. Each entry is a phrase or a word specific enough that a
 * breaker buyer would not stumble into it — which is why "bitcoin" is here and
 * "investment" is not.
 */
const BLOCKLIST: readonly string[] = [
  // SEO / backlink pitches
  'seo services',
  'seo expert',
  'search engine optimization',
  'first page of google',
  'rank your website',
  'backlink',
  'guest post',
  'domain authority',
  'web design services',
  'increase your traffic',

  // Crypto
  'bitcoin',
  'cryptocurrency',
  'crypto wallet',
  'forex',
  'binary option',
  'nft',

  // Loans / finance spam
  'loan offer',
  'payday loan',
  'credit repair',
  'debt relief',
  'wire transfer fee',

  // Generic bulk-mail tells
  'viagra',
  'casino',
  'work from home',
  'make money online',
  'click here now',
  'act now',
  'limited time offer',
] as const;

export interface SpamAssessment {
  /** 0 = clean. Anything above 0 is shown flagged, never hidden. */
  score: number;
  reasons: string[];
}

/** How many links is too many for somebody asking about a circuit breaker. */
const LINK_LIMIT = 2;

const URL_PATTERN = /https?:\/\/|www\./gi;

/**
 * Score the free text of a submission.
 *
 * Weighting is coarse on purpose — this feeds a badge, not a decision.
 */
export function assessText(...parts: (string | undefined | null)[]): SpamAssessment {
  const text = parts.filter(Boolean).join(' \n ').toLowerCase();
  if (!text.trim()) return { score: 0, reasons: [] };

  const reasons: string[] = [];
  let score = 0;

  for (const term of BLOCKLIST) {
    if (text.includes(term)) {
      score += 2;
      reasons.push(`mentions "${term}"`);
    }
  }

  const links = text.match(URL_PATTERN)?.length ?? 0;
  if (links > LINK_LIMIT) {
    score += 2;
    reasons.push(`${links} links`);
  }

  /*
   * Cyrillic or CJK characters in a Lahore trade inquiry are a strong tell.
   * Urdu and Arabic script are NOT flagged — plenty of genuine customers write
   * in Urdu, and flagging them would be both wrong and insulting.
   */
  if (/[Ѐ-ӿ一-鿿]/.test(text)) {
    score += 2;
    reasons.push('unexpected script');
  }

  return { score, reasons: reasons.slice(0, 5) };
}

/** How close together two submissions must be to count as the same one. */
export const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

/**
 * Has this phone number already sent the same thing in the last ten minutes?
 *
 * Almost always a double-tapped submit button or an impatient refresh rather
 * than an attack, which is why the caller treats a hit as "return the original
 * receipt" rather than as an error. Sharjeel gets one lead, the buyer gets a
 * confirmation, and nobody is told off for a slow connection.
 *
 * Matching is on phone plus the exact set of product ids, so a customer who
 * genuinely asks about a *different* breaker two minutes later still gets
 * through.
 */
export async function findRecentDuplicate(
  phone: string,
  productIds: string[],
  now: Date = new Date(),
): Promise<{ inquiryNumber: string } | null> {
  const since = new Date(now.getTime() - DUPLICATE_WINDOW_MS);

  const recent = await Inquiry.find({
    'customer.phone': phone,
    createdAt: { $gte: since },
  })
    .select('inquiryNumber items.product')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean<{ inquiryNumber: string; items: { product: unknown }[] }[]>();

  const wanted = [...productIds].sort().join('|');

  for (const candidate of recent) {
    const seen = candidate.items
      .map((item) => String(item.product))
      .sort()
      .join('|');
    if (seen === wanted) return { inquiryNumber: candidate.inquiryNumber };
  }

  return null;
}
