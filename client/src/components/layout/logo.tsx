import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Wordmark. Rendered as text rather than an image so it stays crisp at any
 * size and costs nothing on a 3G first paint; the SVG asset is used for
 * favicons and the PDF letterhead instead.
 */
export function Logo({
  variant = 'dark',
  className,
  href = '/',
}: {
  /** `dark` for light backgrounds, `light` for the navy footer. */
  variant?: 'dark' | 'light';
  className?: string;
  href?: string | null;
}): JSX.Element {
  const content = (
    <span className={cn('inline-flex flex-col leading-none', className)}>
      <span
        className={cn(
          'font-heading text-xl font-extrabold uppercase tracking-tight sm:text-2xl',
          variant === 'dark' ? 'text-brand-navy' : 'text-white',
        )}
      >
        Fast<span className="text-brand-cyan">Traders</span>
      </span>
      <span
        className={cn(
          'mt-0.5 text-[9px] font-medium uppercase tracking-[0.18em]',
          variant === 'dark' ? 'text-muted-foreground' : 'text-white/60',
        )}
      >
        Industrial &amp; Electrical
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} aria-label="Fast Traders — home" className="shrink-0">
      {content}
    </Link>
  );
}
