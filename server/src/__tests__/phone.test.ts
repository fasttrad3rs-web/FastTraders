import {
  formatPakistaniPhone,
  isPakistaniPhone,
  normalisePakistaniPhone,
  toWhatsAppNumber,
} from '../utils/phone';

/**
 * Phone normalisation.
 *
 * Every one of these formats is something a real buyer types. If any of them
 * fails to normalise, the customer report groups the same person into two
 * rows and the admin search for their number comes back empty.
 */

describe('normalisePakistaniPhone', () => {
  const mobiles: [string, string][] = [
    ['03001234567', '+923001234567'],
    ['0300 1234567', '+923001234567'],
    ['0300-123-4567', '+923001234567'],
    ['+923001234567', '+923001234567'],
    ['+92 300 1234567', '+923001234567'],
    ['923001234567', '+923001234567'],
    ['0092 300 1234567', '+923001234567'],
    ['3001234567', '+923001234567'],
    ['  0324 4234990  ', '+923244234990'],
  ];

  it.each(mobiles)('normalises the mobile %s', (input, expected) => {
    expect(normalisePakistaniPhone(input)).toBe(expected);
  });

  const landlines: [string, string][] = [
    ['04237378460', '+924237378460'],
    ['042 37378460', '+924237378460'],
    ['042-3737-8460', '+924237378460'],
    ['+924237378460', '+924237378460'],
    ['924237378460', '+924237378460'],
    ['+92 42 3737 8460', '+924237378460'],
  ];

  it.each(landlines)('normalises the landline %s', (input, expected) => {
    expect(normalisePakistaniPhone(input)).toBe(expected);
  });

  it('is idempotent — normalising twice changes nothing', () => {
    const once = normalisePakistaniPhone('0300 1234567');
    expect(once).not.toBeNull();
    expect(normalisePakistaniPhone(once as string)).toBe(once);
  });

  const rejected = [
    ['', 'empty'],
    ['   ', 'whitespace'],
    ['0300123', 'too short'],
    ['030012345678901', 'too long'],
    ['0300123456', 'a mobile one digit short'],
    ['030012345678', 'a mobile one digit long'],
    ['+441632960961', 'a UK number'],
    ['not a phone', 'letters'],
  ] as const;

  it.each(rejected)('rejects %s (%s)', (input) => {
    expect(normalisePakistaniPhone(input)).toBeNull();
    expect(isPakistaniPhone(input)).toBe(false);
  });
});

describe('toWhatsAppNumber', () => {
  it('strips the plus for a wa.me link', () => {
    expect(toWhatsAppNumber('0300 1234567')).toBe('923001234567');
  });

  it('returns null for a landline — you cannot WhatsApp a PTCL line', () => {
    expect(toWhatsAppNumber('042 37378460')).toBeNull();
  });

  it('returns null for an unparseable number rather than a broken link', () => {
    expect(toWhatsAppNumber('12345')).toBeNull();
  });
});

describe('formatPakistaniPhone', () => {
  it('groups a mobile for display', () => {
    expect(formatPakistaniPhone('03244234990')).toBe('+92 324 4234990');
  });

  it('groups a landline by its area code', () => {
    expect(formatPakistaniPhone('04237378460')).toBe('+92 42 37378460');
  });

  it('returns the input untouched when it cannot be parsed', () => {
    // Better a visibly odd string in the admin than a silently mangled one.
    expect(formatPakistaniPhone('call the shop')).toBe('call the shop');
  });
});
