import type { Metadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { ButtonsSection } from './sections/buttons-section';
import { CommerceSection } from './sections/commerce-section';
import { DataSection } from './sections/data-section';
import { FeedbackSection } from './sections/feedback-section';
import { FormsSection } from './sections/forms-section';
import { TokensSection } from './sections/tokens-section';

export const metadata: Metadata = {
  title: 'Style guide',
  description: 'Fast Traders design system — tokens, components and patterns.',
  robots: { index: false, follow: false },
};

const SECTIONS = [
  { id: 'tokens', label: 'Tokens' },
  { id: 'buttons', label: 'Buttons & badges' },
  { id: 'forms', label: 'Forms' },
  { id: 'data', label: 'Data display' },
  { id: 'feedback', label: 'Feedback & overlays' },
  { id: 'commerce', label: 'Commerce' },
] as const;

/** Living component showcase. Excluded from search indexing. */
export default function StyleGuidePage(): JSX.Element {
  return (
    <div className="container py-10">
      <header className="mb-10 border-b border-border pb-8">
        <Badge variant="accent">Phase 5</Badge>
        <h1 className="mt-3 font-heading text-3xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-4xl">
          Fast Traders design system
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          Every primitive the storefront and admin panel are built from. Components are wired to
          mock data — swapping in the live API is a change of source, not of markup.
        </p>

        <nav aria-label="Style guide sections" className="mt-6 flex flex-wrap gap-2">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-brand-navy transition-colors hover:border-brand-cyan hover:text-brand-cyan"
            >
              {section.label}
            </a>
          ))}
        </nav>
      </header>

      <div className="space-y-16">
        <TokensSection />
        <ButtonsSection />
        <FormsSection />
        <DataSection />
        <FeedbackSection />
        <CommerceSection />
      </div>
    </div>
  );
}
