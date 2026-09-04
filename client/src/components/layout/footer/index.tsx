import Link from 'next/link';
import { Facebook, Globe, Instagram, Linkedin, Mail, MapPin, Phone, Smartphone } from 'lucide-react';
import { CONTACT, SITE } from '@/lib/constants';
import { mockCategories } from '@/lib/mock-data';
import { Logo } from '../logo';
import { BrandStrip } from './brand-strip';
import { NewsletterSignup } from './newsletter';

/** Navy site footer: four columns, newsletter row, brand strip, legal bar. */

const QUICK_LINKS = [
  { label: 'All Products', href: '/products' },
  { label: 'Brands', href: '/brands' },
  { label: 'Request a Quote', href: '/submit-inquiry' },
  { label: 'Track an Order', href: '/orders/track' },
  { label: 'About Us', href: '/about' },
  { label: 'Contact', href: '/contact' },
] as const;

const SOCIALS = [
  { Icon: Facebook, label: 'Facebook', href: '#' },
  { Icon: Instagram, label: 'Instagram', href: '#' },
  { Icon: Linkedin, label: 'LinkedIn', href: '#' },
] as const;

function ColumnHeading({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <h3 className="mb-4 font-heading text-sm font-bold uppercase tracking-wide text-white">
      {children}
      <span className="mt-2 block h-0.5 w-8 rounded-full bg-brand-cyan" aria-hidden />
    </h3>
  );
}

export function Footer(): JSX.Element {
  return (
    <footer className="bg-brand-dark text-white">
      <NewsletterSignup />

      <div className="container py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* 1 — identity */}
          <div>
            <Logo variant="light" lockup="stacked" height={92} />
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              {SITE.tagline}. Supplying switchgear, automation and control components to industry
              across Pakistan from our counter on Bull Road, Lahore.
            </p>
            <div className="mt-5 flex gap-2">
              {SOCIALS.map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={`Fast Traders on ${label}`}
                  className="flex size-9 items-center justify-center rounded-lg border border-white/15 text-white/70 transition-colors hover:border-brand-cyan hover:bg-brand-cyan hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {/* 2 — quick links */}
          <nav aria-label="Quick links">
            <ColumnHeading>Quick Links</ColumnHeading>
            <ul className="space-y-2.5">
              {QUICK_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/60 transition-colors hover:text-brand-cyan"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 3 — categories */}
          <nav aria-label="Top categories">
            <ColumnHeading>Top Categories</ColumnHeading>
            <ul className="space-y-2.5">
              {mockCategories.slice(0, 6).map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/categories/${category.slug}`}
                    className="text-sm text-white/60 transition-colors hover:text-brand-cyan"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 4 — the full business card */}
          <div>
            <ColumnHeading>Get In Touch</ColumnHeading>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
                <span className="text-white/70">
                  {CONTACT.address.line1},<br />
                  {CONTACT.address.line2}, {CONTACT.address.city},<br />
                  {CONTACT.address.country}
                </span>
              </li>
              <li className="flex gap-2.5">
                <Smartphone className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
                <a href={`tel:${CONTACT.mobile.replace(/\s/g, '')}`} className="text-white/70 hover:text-brand-cyan">
                  {CONTACT.mobile}
                  <span className="ml-1.5 text-2xs uppercase text-white/40">Mobile / WhatsApp</span>
                </a>
              </li>
              <li className="flex gap-2.5">
                <Phone className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
                <a href={`tel:${CONTACT.landline.replace(/\s/g, '')}`} className="text-white/70 hover:text-brand-cyan">
                  {CONTACT.landline}
                  <span className="ml-1.5 text-2xs uppercase text-white/40">Landline</span>
                </a>
              </li>
              <li className="flex gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
                <a href={`mailto:${CONTACT.email}`} className="text-white/70 hover:text-brand-cyan">
                  {CONTACT.email}
                </a>
              </li>
              <li className="flex gap-2.5">
                <Globe className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
                <a href="https://www.fasttraders.co" className="text-white/70 hover:text-brand-cyan">
                  www.fasttraders.co
                </a>
              </li>
            </ul>
          </div>
        </div>

        <BrandStrip />
      </div>

      <div className="border-t border-white/10">
        <div className="container flex flex-col items-center justify-between gap-3 py-5 text-xs text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} Fast Traders. All rights reserved.</p>
          <div className="flex items-center gap-5">
            {/*
              These four pages existed and were built, but only Terms was ever
              linked — so the privacy policy was unreachable, which Google
              Business Profile and Search Console both look for.
            */}
            <Link href="/faq" className="transition-colors hover:text-brand-cyan">
              FAQ
            </Link>
            <Link href="/shipping-returns" className="transition-colors hover:text-brand-cyan">
              Delivery &amp; returns
            </Link>
            <Link href="/privacy-policy" className="transition-colors hover:text-brand-cyan">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-brand-cyan">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
