'use client';

import { Phone, PhoneCall } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { trackCall } from '@/lib/analytics';
import { CONTACT } from '@/lib/constants';

/**
 * Click-to-call.
 *
 * Mobile by default. Almost every buyer here is on a phone, and the mobile
 * number is the one that gets answered and the one with WhatsApp on it. The
 * landline is for people who prefer a shop line, and for anyone who prints
 * the page.
 *
 * `variant` selects the *number*, not the styling — the visual style is
 * `buttonVariant`, because "which line" is the decision a caller of this
 * component actually makes.
 */

export type CallVariant = 'mobile' | 'landline';

const NUMBERS: Record<CallVariant, string> = {
  mobile: CONTACT.mobile,
  landline: CONTACT.landline,
};

/** `tel:` will not dial a number containing spaces or dashes. */
function toTelHref(display: string): string {
  return `tel:${display.replace(/[^\d+]/g, '')}`;
}

export interface CallButtonProps
  extends Omit<ButtonProps, 'asChild' | 'children' | 'variant'> {
  /** Which line to dial. */
  variant?: CallVariant;
  /** Overrides the variant's number. Displayed exactly as given. */
  number?: string;
  label?: string;
  /** Visual style, passed through to `<Button>`. */
  buttonVariant?: ButtonProps['variant'];
  /** Where on the site this was pressed — becomes a GA4 dimension. */
  context?: string;
  /** Attached to the event when the button sits on a product. */
  sku?: string;
  /** Icon only, for tight toolbars. The number stays in the accessible name. */
  iconOnly?: boolean;
}

export function CallButton({
  variant = 'mobile',
  number,
  label,
  buttonVariant = 'primary',
  context,
  sku,
  iconOnly = false,
  size = 'md',
  ...props
}: CallButtonProps): JSX.Element {
  const display = number ?? NUMBERS[variant];
  const text = label ?? `Call ${display}`;
  const Icon = variant === 'landline' ? Phone : PhoneCall;

  return (
    <Button
      asChild
      size={iconOnly ? 'icon' : size}
      variant={buttonVariant}
      aria-label={iconOnly ? text : undefined}
      {...props}
    >
      <a
        href={toTelHref(display)}
        onClick={() =>
          trackCall({
            channel: variant,
            number: display,
            ...(context ? { context } : {}),
            ...(sku ? { sku } : {}),
          })
        }
      >
        <Icon aria-hidden />
        {iconOnly ? <span className="sr-only">{text}</span> : text}
      </a>
    </Button>
  );
}
