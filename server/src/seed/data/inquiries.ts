import type { InquirySeed } from './types';

/**
 * Eight sample inquiries covering every status and both real types.
 *
 * These exist so the admin pipeline has something to look like on day one —
 * an empty board tells you nothing about whether the filters, the priority
 * sort or the follow-up trail actually work. The names and companies are
 * invented; the *situations* are not, and they are the ones the screens have
 * to handle: a repeat customer who always wants a discount, a walk-in with no
 * email, an urgent import, and one that went quiet.
 */
export const inquiries: InquirySeed[] = [
  {
    type: 'product_inquiry',
    status: 'new',
    priority: 'high',
    source: 'website',
    customer: {
      name: 'Imran Sheikh',
      phone: '03004567891',
      whatsapp: '03004567891',
      email: 'imran.sheikh@kohinoormills.com.pk',
      company: 'Kohinoor Textile Mills',
      city: 'Faisalabad',
      designation: 'Maintenance Manager',
    },
    itemSkus: ['TER-S250NJ-3P250', 'SCH-CVS100F-3P100'],
    message:
      'Need these for a loom shed sub-panel upgrade. Please confirm stock and best price for 4 pieces each. Site work starts on the 20th.',
    preferredContactMethod: 'whatsapp',
    preferredContactTime: 'After 4pm — I am on the floor before that',
    daysAgo: 0,
  },
  {
    type: 'product_inquiry',
    status: 'contacted',
    priority: 'normal',
    source: 'website',
    customer: {
      name: 'Adnan Qureshi',
      phone: '03211234567',
      email: 'adnan@qpanels.pk',
      company: 'Qureshi Panel Works',
      city: 'Lahore',
      designation: 'Proprietor',
    },
    itemSkus: ['SCH-LC1D18M7'],
    message: 'Regular requirement — 20 pieces monthly. What is your trade rate?',
    preferredContactMethod: 'phone',
    followUps: [
      {
        note: 'Called, spoke to Adnan. Wants 20/month on a standing order. Asked for a rate sheet — sending on WhatsApp.',
        daysAgo: 1,
        nextFollowUpInDays: 2,
      },
    ],
    daysAgo: 2,
  },
  {
    type: 'sourcing_request',
    status: 'quoted_verbally',
    priority: 'high',
    source: 'whatsapp',
    customer: {
      name: 'Zeeshan Malik',
      phone: '03334455667',
      whatsapp: '03334455667',
      company: 'Sapphire Fibres',
      city: 'Sheikhupura',
      designation: 'Electrical Engineer',
    },
    sourcing: {
      itemDescription:
        'Terasaki AR series ACB, 2000 A, 4-pole, draw-out, with electronic trip unit and earth fault protection. Replacing a failed unit on the main incomer.',
      preferredBrand: 'Terasaki',
      partNumber: 'AR212S',
      specifications: '2000 A, 4P, draw-out, 65 kA Icu, electronic OCR with earth fault',
      quantity: 1,
      unit: 'piece',
      urgency: 'urgent',
      isRepeatRequirement: false,
      application: 'Main LT incomer, 2500 kVA transformer',
      daysUntilTarget: 21,
    },
    message: 'Plant is running on the bypass. Please treat as urgent.',
    preferredContactMethod: 'whatsapp',
    internalQuotedAmount: 1_450_000,
    followUps: [
      {
        note: 'Quoted 14.5 lac verbally on WhatsApp, 3 weeks ex-Japan. He is checking with management.',
        daysAgo: 1,
        nextFollowUpInDays: 1,
      },
    ],
    daysAgo: 3,
  },
  {
    type: 'product_inquiry',
    status: 'negotiating',
    priority: 'normal',
    source: 'phone',
    customer: {
      name: 'Rana Tariq',
      phone: '03008889990',
      email: 'rana.tariq@gmail.com',
      company: 'Tariq Electric Store',
      city: 'Gujranwala',
      designation: 'Dealer',
    },
    itemSkus: ['AUT-PRCM18-8DN', 'AUT-TZN4S-14R'],
    message: 'Dealer pricing for a mixed lot. I can lift 50 pieces if the rate works.',
    preferredContactMethod: 'phone',
    internalQuotedAmount: 187_500,
    followUps: [
      {
        note: 'Quoted 1,87,500 for the lot. He is pushing for 1,70,000. Told him I would check with Sharjeel bhai.',
        daysAgo: 2,
        nextFollowUpInDays: 1,
      },
      {
        note: 'Sharjeel approved 1,78,000 as the floor. Calling him back tomorrow morning.',
        daysAgo: 1,
        nextFollowUpInDays: 1,
      },
    ],
    daysAgo: 6,
  },
  {
    type: 'product_inquiry',
    status: 'won',
    priority: 'normal',
    source: 'walk_in',
    customer: {
      name: 'Muhammad Waseem',
      // No email at all. This is the common case at the counter and the
      // reason email is optional throughout.
      phone: '03451122334',
      city: 'Lahore',
      designation: 'Contractor',
    },
    itemSkus: ['WAG-221413-B50'],
    message: 'Walked in for terminal blocks, took 5 boxes.',
    preferredContactMethod: 'phone',
    internalQuotedAmount: 24_000,
    followUps: [
      { note: 'Collected from the counter and paid cash. Repeat buyer.', daysAgo: 8 },
    ],
    daysAgo: 9,
  },
  {
    type: 'sourcing_request',
    status: 'lost',
    priority: 'low',
    source: 'website',
    customer: {
      name: 'Faisal Nadeem',
      phone: '03135566778',
      email: 'faisal.n@packagesltd.example',
      company: 'Packages Limited',
      city: 'Lahore',
      designation: 'Procurement Officer',
    },
    sourcing: {
      itemDescription: 'Siemens SIMATIC S7-1500 CPU 1515-2 PN with 16DI/16DO modules.',
      preferredBrand: 'Siemens',
      partNumber: '6ES7515-2AM02-0AB0',
      quantity: 2,
      unit: 'piece',
      urgency: 'standard',
      isRepeatRequirement: false,
      application: 'Corrugator line retrofit',
    },
    message: 'Do you deal in Siemens?',
    preferredContactMethod: 'email',
    lostReason: 'We do not carry Siemens. Referred him to a Karachi distributor.',
    followUps: [
      { note: 'Explained we are Mitsubishi and Fuji for PLCs. He needed Siemens specifically.', daysAgo: 12 },
    ],
    daysAgo: 13,
  },
  {
    type: 'product_inquiry',
    status: 'no_response',
    priority: 'low',
    source: 'website',
    customer: {
      name: 'Asim Raza',
      phone: '03217788990',
      email: 'asimraza91@gmail.com',
      city: 'Multan',
    },
    itemSkus: ['SCH-CVS100F-3P100'],
    message: 'Price?',
    preferredContactMethod: 'phone',
    followUps: [
      { note: 'Called twice, no answer. Left a WhatsApp message.', daysAgo: 20 },
      { note: 'Called again. Still nothing. Marking no-response.', daysAgo: 16 },
    ],
    daysAgo: 24,
  },
  {
    type: 'general',
    status: 'contacted',
    priority: 'normal',
    source: 'website',
    customer: {
      name: 'Hina Butt',
      phone: '04237378111',
      email: 'procurement@descon.example',
      company: 'Descon Engineering',
      city: 'Lahore',
      designation: 'Assistant Manager, Procurement',
    },
    message:
      'We are building an approved vendor list for our Lahore projects. Do you supply against purchase orders with 30-day credit terms, and can you share your NTN and bank details?',
    preferredContactMethod: 'email',
    preferredContactTime: 'Office hours',
    followUps: [
      {
        note: 'Emailed the company profile and NTN. She will send the vendor registration form.',
        daysAgo: 4,
        nextFollowUpInDays: 7,
      },
    ],
    daysAgo: 5,
  },
];
