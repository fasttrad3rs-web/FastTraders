import { Coupon, Setting, type ICoupon, type ISetting } from '../models';
import { ApiError } from '../utils/ApiError';

/**
 * Order pricing: tax, delivery and coupons.
 * Every figure is derived server-side from the database — the client's numbers
 * are treated as display-only.
 */

export interface PricingInput {
  subtotal: number;
  city: string;
  couponCode?: string;
}

export interface PricingResult {
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discount: number;
  couponCode?: string;
  total: number;
  etaDays: string;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Resolve delivery cost from the settings rules.
 * Rules are matched most-specific first: exact city, then `*` fallback.
 */
export function resolveShipping(
  settings: Pick<ISetting, 'shippingRules'> | null,
  city: string,
  subtotal: number,
): { cost: number; etaDays: string } {
  const rules = settings?.shippingRules ?? [];
  const normalised = city.trim().toLowerCase();

  const rule =
    rules.find((item) => item.city.toLowerCase() === normalised) ??
    rules.find((item) => item.city === '*');

  if (!rule) return { cost: 0, etaDays: 'To be confirmed' };

  const free = typeof rule.freeAbove === 'number' && subtotal >= rule.freeAbove;
  return { cost: free ? 0 : rule.cost, etaDays: rule.etaDays };
}

/** Validate a coupon and compute the rupee discount it yields. */
export function applyCoupon(coupon: ICoupon, subtotal: number): number {
  const now = Date.now();

  if (!coupon.isActive) throw ApiError.badRequest('This coupon is no longer active');
  if (coupon.validFrom.getTime() > now) throw ApiError.badRequest('This coupon is not active yet');
  if (coupon.validTo.getTime() < now) throw ApiError.badRequest('This coupon has expired');
  if (coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
    throw ApiError.badRequest('This coupon has reached its usage limit');
  }
  if (subtotal < coupon.minOrder) {
    throw ApiError.badRequest(
      `This coupon needs a minimum order of Rs. ${coupon.minOrder.toLocaleString('en-PK')}`,
    );
  }

  const raw = coupon.type === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value;
  const capped =
    coupon.type === 'percent' && typeof coupon.maxDiscount === 'number'
      ? Math.min(raw, coupon.maxDiscount)
      : raw;

  // Never discount below zero.
  return round(Math.min(capped, subtotal));
}

export async function priceOrder({ subtotal, city, couponCode }: PricingInput): Promise<PricingResult> {
  const settings = await Setting.findOne({ key: 'global' })
    .select('shippingRules defaultTaxRate')
    .lean<Pick<ISetting, 'shippingRules' | 'defaultTaxRate'>>();

  const { cost: shippingCost, etaDays } = resolveShipping(settings, city, subtotal);

  let discount = 0;
  let appliedCode: string | undefined;

  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    if (!coupon) throw ApiError.badRequest('That coupon code was not recognised');
    discount = applyCoupon(coupon, subtotal);
    appliedCode = coupon.code;
  }

  const taxRate = settings?.defaultTaxRate ?? 18;
  const taxAmount = round(((subtotal - discount) * taxRate) / 100);
  const total = round(Math.max(0, subtotal - discount + taxAmount + shippingCost));

  return {
    subtotal: round(subtotal),
    taxAmount,
    shippingCost,
    discount,
    ...(appliedCode ? { couponCode: appliedCode } : {}),
    total,
    etaDays,
  };
}
