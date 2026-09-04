/**
 * Pakistani phone numbers.
 *
 * People type these six or seven different ways and every one of them is
 * "correct" locally: 0300 1234567, +92 300 1234567, 923001234567, 042
 * 37378460. Storing them verbatim means the admin search for a customer who
 * rang last month misses, and the WhatsApp link builds a dead URL. So every
 * number is normalised to E.164 (`+92XXXXXXXXXX`) on the way in, and the
 * original formatting is not worth keeping.
 *
 * Mobiles are 3XX + 7 digits (10 national digits). Landlines are a 2–4 digit
 * area code + 6–8 subscriber digits; Lahore is 42, so 042 37378460 normalises
 * to +924237378460.
 */

/** Digits only, with any leading international prefix reduced to nothing. */
function digitsOf(input: string): string {
  return input.replace(/[^\d+]/g, '').replace(/^\+/, '');
}

/**
 * Normalise to `+92XXXXXXXXXX`, or return null if it cannot be one.
 *
 * Returns null rather than throwing so validators can attach a field-level
 * message and callers can decide what an unparseable number means.
 */
export function normalisePakistaniPhone(input: string): string | null {
  const digits = digitsOf(input.trim());
  if (digits.length === 0) return null;

  let national: string;

  if (digits.startsWith('0092')) {
    national = digits.slice(4);
  } else if (digits.startsWith('92') && digits.length >= 11) {
    national = digits.slice(2);
  } else if (digits.startsWith('0')) {
    national = digits.slice(1);
  } else {
    national = digits;
  }

  // A leading zero can survive the 92 strip (e.g. "92 042 ..." typed by hand).
  national = national.replace(/^0+/, '');

  if (!/^\d{9,11}$/.test(national)) return null;

  // Mobile: 3XX XXXXXXX, exactly 10 digits.
  if (national.startsWith('3')) {
    return national.length === 10 ? `+92${national}` : null;
  }

  // Landline: area code 2-4 digits then 6-8 subscriber digits. The combined
  // length is the only thing worth checking without an area-code table.
  return national.length >= 9 && national.length <= 11 ? `+92${national}` : null;
}

/** True when the input can be normalised. */
export function isPakistaniPhone(input: string): boolean {
  return normalisePakistaniPhone(input) !== null;
}

/**
 * Digits only, for a `wa.me` link. WhatsApp wants no `+`.
 * Returns null for a landline — you cannot WhatsApp a PTCL line.
 */
export function toWhatsAppNumber(input: string): string | null {
  const normalised = normalisePakistaniPhone(input);
  if (!normalised) return null;

  const national = normalised.slice(3);
  return national.startsWith('3') ? normalised.slice(1) : null;
}

/** `+92 300 1234567` — for display in the admin and in emails. */
export function formatPakistaniPhone(input: string): string {
  const normalised = normalisePakistaniPhone(input);
  if (!normalised) return input;

  const national = normalised.slice(3);
  return national.startsWith('3')
    ? `+92 ${national.slice(0, 3)} ${national.slice(3)}`
    : `+92 ${national.slice(0, 2)} ${national.slice(2)}`;
}
