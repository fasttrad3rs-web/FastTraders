'use client';

import { Toaster as Sonner, toast } from 'sonner';

/**
 * Toaster built on sonner, themed to the brand palette.
 * Positioned bottom-centre on phones so it never covers the sticky bottom nav
 * or the floating WhatsApp button.
 */
export function Toaster(): JSX.Element {
  return (
    <Sonner
      position="top-right"
      mobileOffset={{ bottom: 88 }}
      toastOptions={{
        classNames: {
          toast:
            'group rounded-lg border border-border bg-white text-foreground shadow-panel font-sans text-sm',
          title: 'font-semibold text-brand-navy',
          description: 'text-muted-foreground',
          actionButton: 'bg-brand-cyan text-white rounded-md',
          cancelButton: 'bg-muted text-muted-foreground rounded-md',
          success: 'border-success/30',
          error: 'border-destructive/30',
          warning: 'border-warning/40',
          info: 'border-brand-cyan/30',
        },
      }}
      closeButton
      richColors={false}
      duration={4000}
    />
  );
}

export { toast };
