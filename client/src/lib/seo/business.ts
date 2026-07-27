import { CONTACT, SITE } from '@/lib/constants';

/**
 * Structured data for the business itself.
 *
 * The address, both phone numbers and the opening hours are the client's real
 * details — this is what feeds the Google Business panel for searches like
 * "circuit breakers Lahore", so it has to match the shopfront exactly.
 */

/** Grace Tower, Bull Road, Lahore. Refine with an exact GPS pin before launch. */
export const GEO = { latitude: 31.5497, longitude: 74.3436 } as const;

export const TARGET_KEYWORDS = [
  'circuit breakers Lahore',
  'electrical components Pakistan',
  'Schneider Electric dealer Lahore',
  'industrial automation parts Lahore',
  'MCCB price in Pakistan',
  'cable supplier Lahore',
] as const;

export function organizationSchema(): Record<string, unknown> {
  return {
    '@type': 'Organization',
    '@id': `${SITE.url}/#organization`,
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/brand/logo.svg`,
    description: SITE.shortDescription,
    founder: { '@type': 'Person', name: 'Sharjeel Bin Ejaz' },
    email: CONTACT.email,
    telephone: CONTACT.mobile,
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${CONTACT.address.line1}, ${CONTACT.address.line2}`,
      addressLocality: CONTACT.address.city,
      addressRegion: 'Punjab',
      addressCountry: 'PK',
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: CONTACT.mobile,
        contactType: 'sales',
        areaServed: 'PK',
        availableLanguage: ['English', 'Urdu'],
      },
      {
        '@type': 'ContactPoint',
        telephone: CONTACT.landline,
        contactType: 'customer service',
        areaServed: 'PK',
      },
    ],
  };
}

export function localBusinessSchema(): Record<string, unknown> {
  return {
    '@type': ['Store', 'ElectricalContractor'],
    '@id': `${SITE.url}/#localbusiness`,
    name: SITE.name,
    image: `${SITE.url}/brand/logo.svg`,
    url: SITE.url,
    telephone: CONTACT.landline,
    email: CONTACT.email,
    priceRange: 'Rs.',
    currenciesAccepted: 'PKR',
    paymentAccepted: 'Cash, Bank Transfer, Credit Card, JazzCash, Easypaisa',
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${CONTACT.address.line1}, ${CONTACT.address.line2}`,
      addressLocality: CONTACT.address.city,
      addressRegion: 'Punjab',
      addressCountry: 'PK',
    },
    geo: { '@type': 'GeoCoordinates', ...GEO },
    // Mon–Sat 10:00–19:00; closed Sunday.
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '10:00',
        closes: '19:00',
      },
    ],
    areaServed: [
      { '@type': 'City', name: 'Lahore' },
      { '@type': 'Country', name: 'Pakistan' },
    ],
    parentOrganization: { '@id': `${SITE.url}/#organization` },
  };
}

export function websiteSchema(): Record<string, unknown> {
  return {
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    publisher: { '@id': `${SITE.url}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE.url}/products?search={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}
