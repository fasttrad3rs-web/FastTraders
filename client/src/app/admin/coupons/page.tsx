'use client';

import { Badge } from '@/components/ui/badge';
import { ResourceScreen } from '@/components/admin/crud/resource-screen';
import { formatDate, formatPKR } from '@/lib/utils';

interface CouponRecord {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minOrder: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  [key: string]: unknown;
}

/** Coupon CRUD with live usage stats on each row. */
export default function AdminCouponsPage(): JSX.Element {
  return (
    <ResourceScreen<CouponRecord>
      resource="coupons"
      title="Coupons"
      description="Discount codes applied at checkout. The server re-validates every code when an order is placed."
      fields={[
        { name: 'code', label: 'Code', kind: 'text', required: true, placeholder: 'TRADE5' },
        {
          name: 'type',
          label: 'Type',
          kind: 'select',
          required: true,
          options: [
            { value: 'percent', label: 'Percentage off' },
            { value: 'fixed', label: 'Fixed amount off (Rs.)' },
          ],
        },
        { name: 'value', label: 'Value', kind: 'number', required: true, hint: 'Percent (max 100) or rupees.' },
        { name: 'minOrder', label: 'Minimum order (Rs.)', kind: 'number' },
        { name: 'maxDiscount', label: 'Maximum discount (Rs.)', kind: 'number', hint: 'Caps percentage coupons.' },
        { name: 'usageLimit', label: 'Usage limit', kind: 'number', hint: 'Leave blank for unlimited.' },
        { name: 'validFrom', label: 'Valid from', kind: 'date' },
        { name: 'validTo', label: 'Valid to', kind: 'date', required: true },
        { name: 'isActive', label: 'Active', kind: 'boolean' },
      ]}
      columns={[]}
      emptyTitle="No coupons yet"
      renderRow={(coupon) => {
        const expired = new Date(coupon.validTo).getTime() < Date.now();
        const exhausted = coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit;

        return (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="rounded bg-brand-navy px-2 py-1 font-mono text-xs font-bold text-white">
              {coupon.code}
            </span>
            <span className="text-sm font-semibold text-foreground">
              {coupon.type === 'percent' ? `${coupon.value}% off` : `${formatPKR(coupon.value)} off`}
              {coupon.maxDiscount ? ` (max ${formatPKR(coupon.maxDiscount)})` : ''}
            </span>
            <span className="text-2xs text-muted-foreground">
              Min order {formatPKR(coupon.minOrder)} · used {coupon.usedCount}
              {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''} · expires {formatDate(coupon.validTo)}
            </span>
            {!coupon.isActive ? <Badge variant="muted">Disabled</Badge> : null}
            {expired ? <Badge variant="danger">Expired</Badge> : null}
            {exhausted ? <Badge variant="warning">Limit reached</Badge> : null}
            {coupon.isActive && !expired && !exhausted ? <Badge variant="success">Live</Badge> : null}
          </div>
        );
      }}
    />
  );
}
