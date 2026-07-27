'use client';

import { Banknote, CreditCard, Landmark, Smartphone } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/checkbox';
import { Alert } from '@/components/ui/alert';
import type { Setting } from '@/types';
import { cn } from '@/lib/utils';

/**
 * Payment selection.
 *
 * COD and bank transfer are what most Pakistani B2B customers actually use, so
 * they lead. Card is live via Stripe; JazzCash and Easypaisa are wired as
 * adapters on the server but not yet contracted, so they are shown disabled
 * rather than hidden — the client asked for them and customers look for them.
 */

export type PaymentMethod = 'cod' | 'bank_transfer' | 'stripe' | 'jazzcash' | 'easypaisa';

const METHODS: {
  value: PaymentMethod;
  label: string;
  body: string;
  Icon: typeof Banknote;
  disabled?: boolean;
}[] = [
  { value: 'cod', label: 'Cash on Delivery', body: 'Pay the courier or at our counter.', Icon: Banknote },
  { value: 'bank_transfer', label: 'Bank Transfer', body: 'Transfer and send us the receipt.', Icon: Landmark },
  { value: 'stripe', label: 'Card', body: 'Visa or Mastercard, processed by Stripe.', Icon: CreditCard },
  { value: 'jazzcash', label: 'JazzCash', body: 'Coming soon — use COD or bank transfer.', Icon: Smartphone, disabled: true },
  { value: 'easypaisa', label: 'Easypaisa', body: 'Coming soon — use COD or bank transfer.', Icon: Smartphone, disabled: true },
];

export function PaymentMethods({
  value,
  onChange,
  settings,
}: {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  settings: Setting | null;
}): JSX.Element {
  const bank = settings?.bankDetails;

  return (
    <div className="space-y-3">
      <RadioGroup value={value} onValueChange={(next) => onChange(next as PaymentMethod)}>
        {METHODS.map(({ value: method, label, body, Icon, disabled }) => (
          <label
            key={method}
            htmlFor={`pay-${method}`}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
              disabled && 'cursor-not-allowed opacity-55',
              value === method ? 'border-brand-cyan bg-brand-cyan/5' : 'border-border bg-white hover:border-brand-navy/40',
            )}
          >
            <RadioGroupItem value={method} id={`pay-${method}`} disabled={disabled} className="mt-0.5" />
            <Icon className="mt-0.5 size-5 shrink-0 text-brand-navy" aria-hidden />
            <span className="min-w-0">
              <Label htmlFor={`pay-${method}`} className="cursor-pointer">
                {label}
              </Label>
              <span className="mt-0.5 block text-xs text-muted-foreground">{body}</span>
            </span>
          </label>
        ))}
      </RadioGroup>

      {value === 'bank_transfer' ? (
        bank ? (
          <Alert variant="info" title="Transfer to">
            <dl className="mt-1 space-y-1 text-xs">
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-muted-foreground">Bank</dt>
                <dd className="font-medium text-foreground">{bank.bankName}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-muted-foreground">Account title</dt>
                <dd className="font-medium text-foreground">{bank.accountTitle}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-muted-foreground">Account no.</dt>
                <dd className="font-mono font-medium text-foreground">{bank.accountNumber}</dd>
              </div>
              {bank.iban ? (
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 text-muted-foreground">IBAN</dt>
                  <dd className="font-mono font-medium text-foreground">{bank.iban}</dd>
                </div>
              ) : null}
            </dl>
            <p className="mt-2 text-xs">
              Quote your order number on the transfer and WhatsApp the receipt to +92 324 4234990.
            </p>
          </Alert>
        ) : (
          <Alert variant="warning" title="Bank details not published yet">
            Place the order and we will send the account details with your confirmation email.
          </Alert>
        )
      ) : null}

      {value === 'stripe' ? (
        <Alert variant="info">
          You will be redirected to Stripe&rsquo;s secure page to pay after the order is placed. We
          never see or store your card number.
        </Alert>
      ) : null}
    </div>
  );
}
