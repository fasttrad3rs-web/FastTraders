import { SectionHeading } from '@/components/ui/separator';

/** Colour, typography, radius and shadow tokens. */

const COLOURS = [
  { name: 'brand-navy', hex: '#1B2A6B', className: 'bg-brand-navy', note: 'Primary' },
  { name: 'brand-cyan', hex: '#00AEEF', className: 'bg-brand-cyan', note: 'Accent / CTA' },
  { name: 'brand-dark', hex: '#0F1B4C', className: 'bg-brand-dark', note: 'Gradient start' },
  { name: 'surface', hex: '#F7F9FC', className: 'bg-surface border border-border', note: 'Page background' },
  { name: 'foreground', hex: '#1A1A1A', className: 'bg-foreground', note: 'Body text' },
  { name: 'muted-foreground', hex: '#5A6472', className: 'bg-muted-foreground', note: 'Secondary text' },
  { name: 'success', hex: 'hsl(152 62% 34%)', className: 'bg-success', note: 'In stock' },
  { name: 'warning', hex: 'hsl(38 92% 45%)', className: 'bg-warning', note: 'Low stock' },
  { name: 'destructive', hex: 'hsl(0 72% 45%)', className: 'bg-destructive', note: 'Errors' },
];

export function TokensSection(): JSX.Element {
  return (
    <section id="tokens" className="scroll-mt-24">
      <SectionHeading title="Design tokens" description="Every colour resolves through a CSS variable, so a dark theme is a variable swap rather than a rewrite." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {COLOURS.map((colour) => (
          <div key={colour.name} className="overflow-hidden rounded-lg border border-border bg-white">
            <div className={`h-16 ${colour.className}`} />
            <div className="p-3">
              <p className="text-xs font-bold text-brand-navy">{colour.name}</p>
              <p className="mt-0.5 font-mono text-2xs text-muted-foreground">{colour.hex}</p>
              <p className="mt-1 text-2xs text-muted-foreground">{colour.note}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-white p-6">
          <p className="mb-4 text-2xs font-bold uppercase tracking-wide text-muted-foreground">Typography</p>
          <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight text-brand-navy">
            Heading 1 — Poppins
          </h1>
          <h2 className="mt-3 font-heading text-2xl font-bold uppercase tracking-tight text-brand-navy">Heading 2</h2>
          <h3 className="mt-3 font-heading text-lg font-bold text-brand-navy">Heading 3</h3>
          <p className="mt-4 text-sm text-foreground">
            Body copy is set in Inter at 14–16 px. It stays legible at small sizes on the cheap
            Android screens that make up most of this traffic.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Secondary text · 12 px · muted-foreground</p>
          <p className="mt-2 font-mono text-2xs text-muted-foreground">SKU SCH-CVS100F-3P100 · 11 px mono</p>
        </div>

        <div className="rounded-lg border border-border bg-white p-6">
          <p className="mb-4 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
            Radius &amp; elevation
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'shadow-soft', className: 'shadow-soft' },
              { label: 'shadow-card', className: 'shadow-card' },
              { label: 'shadow-card-hover', className: 'shadow-card-hover' },
              { label: 'shadow-panel', className: 'shadow-panel' },
            ].map((shadow) => (
              <div
                key={shadow.label}
                className={`flex h-20 items-center justify-center rounded-lg border border-border bg-white text-xs font-medium text-muted-foreground ${shadow.className}`}
              >
                {shadow.label}
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Default radius is <code className="font-mono text-brand-navy">rounded-lg</code> (8 px).
            Container is capped at 1400 px.
          </p>
        </div>
      </div>
    </section>
  );
}
