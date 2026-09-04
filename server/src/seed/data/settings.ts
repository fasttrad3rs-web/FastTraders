import type { ISetting } from '../../models/Setting';

/** Site-wide configuration seeded from the client's business details. */
export const settings: Omit<ISetting, 'createdAt' | 'updatedAt'> = {
  key: 'global',
  storeName: 'Fast Traders',
  tagline: 'We Deal In All Kinds Of Industrial Equipment, Parts & Accessories',
  email: 'fasttrad3rs@gmail.com',
  phone: '+92 324 4234990',
  landline: '+92 42 37378460',
  whatsapp: '923244234990',
  address: 'Shop No. 30, Grace Tower, Bull Road, Lahore, Pakistan',
  social: {
    whatsapp: 'https://wa.me/923244234990',
  },
  businessHours: [
    { days: 'Monday – Saturday', open: '10:00', close: '19:00' },
    { days: 'Friday', open: '10:00', close: '19:00', note: 'Closed 13:00 – 14:30 for Jumu\'ah' },
    { days: 'Sunday', open: 'Closed', close: 'Closed' },
  ],
  currency: 'PKR',
  announcement: {
    text: 'Same-day collection available from our Bull Road counter — call +92 324 4234990.',
    link: '/contact',
    isActive: true,
  },
  bankDetails: {
    bankName: 'Update in admin settings',
    accountTitle: 'Fast Traders',
    accountNumber: 'Update in admin settings',
  },
};
