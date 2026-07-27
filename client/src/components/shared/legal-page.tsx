import { Breadcrumb } from '@/components/ui/pagination';
import { CONTACT } from '@/lib/constants';

/**
 * Shared shell for policy pages.
 *
 * The copy below is a reasonable starting position drafted from how the
 * business actually operates — it is not legal advice, and the client should
 * have a lawyer review it before launch. That caveat is printed on the page.
 */
export function LegalPage({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: { heading: string; body: string[] }[];
}): JSX.Element {
  return (
    <div className="container py-8">
      <Breadcrumb items={[{ label: title }]} className="mb-4" />

      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 text-xs text-muted-foreground">Last updated {updated}</p>

      <div className="mt-6 max-w-3xl space-y-6">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-heading text-base font-bold text-brand-navy">{section.heading}</h2>
            <div className="mt-2 space-y-2.5 text-sm leading-relaxed text-muted-foreground">
              {section.body.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-lg border border-border bg-surface p-5 text-sm">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            Questions about this policy
          </h2>
          <p className="mt-2 text-muted-foreground">
            Contact Fast Traders at {CONTACT.address.full}, on {CONTACT.mobile}, or by email at{' '}
            <a href={`mailto:${CONTACT.email}`} className="text-brand-cyan hover:underline">
              {CONTACT.email}
            </a>
            .
          </p>
        </section>

        <p className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-xs text-foreground">
          <strong>Note for Fast Traders:</strong> this text is a practical starting point based on
          how the business operates. Have it reviewed by a lawyer before launch — it is not legal
          advice.
        </p>
      </div>
    </div>
  );
}
