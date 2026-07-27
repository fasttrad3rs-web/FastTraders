/** Shared visual language for generated PDFs — mirrors the web brand tokens. */

export const COLORS = {
  navy: '#1B2A6B',
  dark: '#0F1B4C',
  cyan: '#00AEEF',
  surface: '#F7F9FC',
  ink: '#1A1A1A',
  muted: '#5A6472',
  line: '#D8DEE9',
  white: '#FFFFFF',
} as const;

export const PAGE = {
  size: 'A4' as const,
  margin: 45,
  /** A4 width (595.28pt) minus both margins. */
  contentWidth: 595.28 - 90,
};

/** Business details, printed on every letterhead. */
export const BUSINESS = {
  name: 'FAST TRADERS',
  tagline: 'We Deal In All Kinds Of Industrial Equipment, Parts & Accessories',
  proprietor: 'Sharjeel Bin Ejaz',
  address: 'Shop No. 30, Grace Tower, Bull Road, Lahore, Pakistan',
  mobile: '+92 324 4234990',
  landline: '+92 42 37378460',
  email: 'fasttrad3rs@gmail.com',
  website: 'www.fasttraders.co',
} as const;

/** Rs. 1,234,567 — no decimals; PKR invoices are quoted in whole rupees. */
export function money(amount: number): string {
  return `Rs. ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(Math.round(amount))}`;
}

export function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(value);
}

/**
 * Spell a rupee amount in words — Pakistani invoices are expected to carry it,
 * and it makes tampering with the figure obvious.
 */
export function amountInWords(amount: number): string {
  const value = Math.round(amount);
  if (value === 0) return 'Zero Rupees Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
    'Eighteen', 'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const belowHundred = (n: number): string => {
    if (n < 20) return ones[n] ?? '';
    const ten = tens[Math.floor(n / 10)] ?? '';
    const one = ones[n % 10] ?? '';
    return one ? `${ten} ${one}` : ten;
  };

  const belowThousand = (n: number): string => {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    const parts = [hundred ? `${ones[hundred] ?? ''} Hundred` : '', rest ? belowHundred(rest) : ''];
    return parts.filter(Boolean).join(' ');
  };

  // South Asian numbering: crore, lakh, thousand.
  const units: [number, string][] = [
    [10_000_000, 'Crore'],
    [100_000, 'Lakh'],
    [1_000, 'Thousand'],
  ];

  let remaining = value;
  const words: string[] = [];

  for (const [divisor, label] of units) {
    const count = Math.floor(remaining / divisor);
    if (count > 0) {
      words.push(`${belowThousand(count)} ${label}`);
      remaining %= divisor;
    }
  }
  if (remaining > 0) words.push(belowThousand(remaining));

  return `${words.join(' ').replace(/\s+/g, ' ').trim()} Rupees Only`;
}
