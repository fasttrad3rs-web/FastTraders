import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Renders the field in an error state and wires up aria-invalid. */
  hasError?: boolean;
  /** Icon rendered inside the field on the left (e.g. search). */
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', hasError, leadingIcon, trailingIcon, ...props }, ref) => {
    const field = (
      <input
        type={type}
        ref={ref}
        aria-invalid={hasError ?? undefined}
        className={cn(
          'flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm text-foreground transition-colors',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60',
          hasError ? 'border-destructive' : 'border-border hover:border-brand-navy/40',
          leadingIcon && 'pl-10',
          trailingIcon && 'pr-10',
          className,
        )}
        {...props}
      />
    );

    if (!leadingIcon && !trailingIcon) return field;

    return (
      <div className="relative">
        {leadingIcon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4">
            {leadingIcon}
          </span>
        ) : null}
        {field}
        {trailingIcon ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4">
            {trailingIcon}
          </span>
        ) : null}
      </div>
    );
  },
);
Input.displayName = 'Input';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean }
>(({ className, hasError, ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={hasError ?? undefined}
    className={cn(
      'flex min-h-[96px] w-full rounded-lg border bg-white px-3 py-2 text-sm text-foreground transition-colors',
      'placeholder:text-muted-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-1',
      'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60',
      hasError ? 'border-destructive' : 'border-border hover:border-brand-navy/40',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export { Input, Textarea };
