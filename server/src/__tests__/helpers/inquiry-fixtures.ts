import { Types } from 'mongoose';
import * as listService from '../../services/inquiry-list.service';
import * as inquiryService from '../../services/inquiry.service';

/**
 * Shared stubs for the public inquiry suites.
 *
 * The `jest.mock` calls stay in each test file — the factories are hoisted
 * above the imports, so they cannot live here. By the time this module is
 * required the mock registry is already in place, which is why casting the
 * imports to `jest.Mocked` below works.
 */

export const list = listService as jest.Mocked<typeof listService>;
export const inquiries = inquiryService as jest.Mocked<typeof inquiryService>;

/** What `getOrCreate` resolves to — suites override it to test an empty list. */
export type InquiryListResult = Awaited<ReturnType<typeof listService.getOrCreate>>;

export const SESSION_COOKIE = 'ft_session_id=11111111-2222-3333-4444-555555555555';

/** A lead the shop would actually recognise: phone, company, city, no email. */
export const validCustomer = {
  name: 'Imran Sheikh',
  phone: '0300 1234567',
  company: 'Kohinoor Textile Mills',
  city: 'Lahore',
};

/** What a successful submission returns. */
export interface InquiryReply {
  inquiryNumber: string;
  /** How many attachments survived the signature check — a count, not a flag. */
  attachmentsAccepted?: number;
  attachmentsRejected?: { name: string; reason: string }[];
}

/** Reset every stub to the happy path. Call from `beforeEach`. */
export function stubInquiryServices(): void {
  const productId = new Types.ObjectId();

  list.getOrCreate.mockResolvedValue({
    items: [{ product: productId, qty: 4, addedAt: new Date() }],
  } as unknown as Awaited<ReturnType<typeof listService.getOrCreate>>);

  list.clear.mockResolvedValue({} as Awaited<ReturnType<typeof listService.clear>>);

  inquiries.buildItemsFromList.mockResolvedValue([
    { product: productId, name: 'Terasaki S250-NJ', sku: 'TER-S250NJ', qty: 4, unit: 'piece' },
  ]);

  inquiries.createInquiry.mockImplementation((args) =>
    Promise.resolve({
      inquiryNumber: 'FT-INQ-202607-0001',
      ...args,
    } as unknown as Awaited<ReturnType<typeof inquiryService.createInquiry>>),
  );
}
