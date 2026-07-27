import { BadgeCheck, Headset, Layers, ShieldCheck, Truck } from 'lucide-react';

/** Five reassurances, directly under the hero — the classic B2B trust bar. */
const ITEMS = [
  { Icon: ShieldCheck, title: 'Genuine Products', body: 'Sourced through official channels' },
  { Icon: BadgeCheck, title: 'Authorized Brands', body: 'Stockist for 12 manufacturers' },
  { Icon: Truck, title: 'Fast Lahore Delivery', body: 'Same-day counter collection' },
  { Icon: Headset, title: 'Technical Support', body: 'Talk to someone who knows the part' },
  { Icon: Layers, title: '20+ Categories', body: 'Switchgear to automation' },
] as const;

export function TrustStrip(): JSX.Element {
  return (
    <section aria-label="Why buy from Fast Traders" className="border-b border-border bg-white">
      <ul className="container grid grid-cols-2 gap-x-4 gap-y-5 py-6 md:grid-cols-3 lg:grid-cols-5">
        {ITEMS.map(({ Icon, title, body }) => (
          <li key={title} className="flex items-start gap-2.5">
            <Icon className="mt-0.5 size-5 shrink-0 text-brand-cyan" aria-hidden />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-navy">{title}</p>
              <p className="mt-0.5 text-2xs text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
