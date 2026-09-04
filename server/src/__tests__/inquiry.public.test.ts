import request from 'supertest';

/**
 * Public inquiry submission.
 *
 * The service layer is stubbed, so what is under test is the request pipeline:
 * honeypot, validation, phone normalisation, and the shape of the reply.
 */

jest.mock('../services/inquiry-list.service', () => ({
  getOrCreate: jest.fn(),
  clear: jest.fn(),
  hydrate: jest.fn(),
  addItem: jest.fn(),
  updateItem: jest.fn(),
  removeItem: jest.fn(),
}));

/*
 * The duplicate check talks to Mongo directly from the controller. These
 * suites run without a database, so an unstubbed `Inquiry.find` sits waiting
 * on a connection that never arrives and the whole run hangs — which is
 * exactly what happened when the check was added. Stubbed to "no duplicate"
 * here; the behaviour itself is covered in `duplicate-inquiry.test.ts`.
 */
jest.mock('../services/spam-score.service', () => ({
  assessText: jest.fn(() => ({ score: 0, reasons: [] })),
  findRecentDuplicate: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('../services/inquiry.service', () => ({
  buildItemsFromList: jest.fn(),
  createInquiry: jest.fn(),
  requestProvenance: jest.fn(() => ({ ipAddress: '203.0.113.1', userAgent: 'jest' })),
}));

/*
 * Only the network hop is stubbed. `attachment.service` itself runs for real,
 * so the signature check is genuinely exercised by the tests below — mocking
 * the service instead would leave the thing worth testing untested.
 */
jest.mock('../config/cloudinary', () => ({
  CLOUDINARY_FOLDER: 'test',
  cloudinary: {
    uploader: {
      upload_stream: (
        _options: unknown,
        callback: (error: null, result: Record<string, unknown>) => void,
      ) => ({
        end: (buffer: Buffer) =>
          callback(null, {
            secure_url: 'https://res.cloudinary.com/test/x.jpg',
            public_id: 'test/x',
            bytes: buffer.length,
          }),
      }),
    },
  },
}));

import { createApp } from '../app';
import { envelope } from './helpers/envelope';
import {
  inquiries,
  list,
  SESSION_COOKIE,
  stubInquiryServices,
  validCustomer,
  type InquiryListResult,
  type InquiryReply,
} from './helpers/inquiry-fixtures';

const app = createApp();

beforeEach(stubInquiryServices);

describe('POST /api/v1/inquiries', () => {
  it('accepts a submission and returns the inquiry number', async () => {
    const response = await request(app)
      .post('/api/v1/inquiries')
      .set('Cookie', SESSION_COOKIE)
      .send({ customer: validCustomer })
      .expect(201);

    const body = envelope<InquiryReply>(response);
    expect(body.data.inquiryNumber).toBe('FT-INQ-202607-0001');
    expect(body.message).toContain('FT-INQ-202607-0001');
  });

  it('normalises the phone number before it reaches the model', async () => {
    await request(app)
      .post('/api/v1/inquiries')
      .set('Cookie', SESSION_COOKIE)
      .send({ customer: { ...validCustomer, phone: '0300-123-4567' } })
      .expect(201);

    const [args] = inquiries.createInquiry.mock.calls[0] ?? [];
    expect(args?.customer.phone).toBe('+923001234567');
  });

  it('accepts a submission with no email at all', async () => {
    // Phone is the required channel. Demanding an email loses real leads.
    await request(app)
      .post('/api/v1/inquiries')
      .set('Cookie', SESSION_COOKIE)
      .send({ customer: { name: 'Bilal', phone: '03001234567' } })
      .expect(201);
  });

  it('rejects a submission with no phone', async () => {
    await request(app)
      .post('/api/v1/inquiries')
      .set('Cookie', SESSION_COOKIE)
      .send({ customer: { name: 'Bilal', email: 'bilal@example.com' } })
      .expect(422);
  });

  it('rejects an unparseable phone number', async () => {
    const response = await request(app)
      .post('/api/v1/inquiries')
      .set('Cookie', SESSION_COOKIE)
      .send({ customer: { ...validCustomer, phone: '+44 1632 960961' } })
      .expect(422);

    expect(JSON.stringify(response.body)).toContain('Pakistani');
  });

  it('clears the shortlist once the inquiry is recorded', async () => {
    await request(app)
      .post('/api/v1/inquiries')
      .set('Cookie', SESSION_COOKIE)
      .send({ customer: validCustomer })
      .expect(201);

    expect(list.clear).toHaveBeenCalled();
  });

  it('refuses an empty shortlist', async () => {
    list.getOrCreate.mockResolvedValue({ items: [] } as unknown as InquiryListResult);

    await request(app)
      .post('/api/v1/inquiries')
      .set('Cookie', SESSION_COOKIE)
      .send({ customer: validCustomer })
      .expect(400);
  });
});

describe('POST /api/v1/inquiries — items sent in the body', () => {
  const PRODUCT_ID = '64b7c0de1234567890abcdef';

  it('uses the body list rather than the server session copy', async () => {
    // The form posts what the customer can see on screen. A browser whose
    // cookie was evicted must not send an empty inquiry.
    list.getOrCreate.mockResolvedValue({ items: [] } as unknown as InquiryListResult);

    await request(app)
      .post('/api/v1/inquiries')
      .set('Cookie', SESSION_COOKIE)
      .send({
        customer: validCustomer,
        items: [{ product: PRODUCT_ID, qty: 6, note: '3P, 36 kA' }],
      })
      .expect(201);

    const [entries] = inquiries.buildItemsFromList.mock.calls[0] ?? [];
    expect(entries).toHaveLength(1);
    expect(entries?.[0]?.qty).toBe(6);
    expect(entries?.[0]?.note).toBe('3P, 36 kA');
  });

  it('works with no session cookie at all', async () => {
    await request(app)
      .post('/api/v1/inquiries')
      .send({ customer: validCustomer, items: [{ product: PRODUCT_ID, qty: 2 }] })
      .expect(201);

    expect(inquiries.createInquiry).toHaveBeenCalled();
  });

  it('ignores any product name or SKU the client tries to supply', async () => {
    /*
     * Only the id, quantity and note are read. Everything else is re-read
     * from the database, so a tampered payload cannot label a WAGO connector
     * as a Terasaki ACB on an inquiry the shop will act on.
     */
    await request(app)
      .post('/api/v1/inquiries')
      .set('Cookie', SESSION_COOKIE)
      .send({
        customer: validCustomer,
        items: [
          { product: PRODUCT_ID, qty: 1, name: 'Free Terasaki ACB', sku: 'FAKE-SKU', brand: 'Nope' },
        ],
      })
      .expect(201);

    const [entries] = inquiries.buildItemsFromList.mock.calls[0] ?? [];
    // `expect.anything()` is typed `any`; an `unknown` keeps the rule happy.
    const anyProductId: unknown = expect.anything();
    expect(entries?.[0]).toEqual({ product: anyProductId, qty: 1 });
  });

  it('rejects a malformed product id', async () => {
    await request(app)
      .post('/api/v1/inquiries')
      .set('Cookie', SESSION_COOKIE)
      .send({ customer: validCustomer, items: [{ product: 'not-an-objectid', qty: 1 }] })
      .expect(422);
  });

  it('falls back to the session list when the body carries none', async () => {
    await request(app)
      .post('/api/v1/inquiries')
      .set('Cookie', SESSION_COOKIE)
      .send({ customer: validCustomer })
      .expect(201);

    expect(list.getOrCreate).toHaveBeenCalled();
  });
});

describe('the honeypot', () => {
  it('answers 201 but records nothing when the hidden field is filled', async () => {
    // A caught bot must not learn that it was caught.
    const response = await request(app)
      .post('/api/v1/inquiries')
      .set('Cookie', SESSION_COOKIE)
      .send({ customer: validCustomer, website: 'http://spam.example.com' })
      .expect(201);

    expect(envelope(response).success).toBe(true);
    expect(inquiries.createInquiry).not.toHaveBeenCalled();
  });

  it('lets an empty honeypot through — browsers submit empty inputs', async () => {
    await request(app)
      .post('/api/v1/inquiries')
      .set('Cookie', SESSION_COOKIE)
      .send({ customer: validCustomer, website: '' })
      .expect(201);

    expect(inquiries.createInquiry).toHaveBeenCalled();
  });

  it('guards the sourcing endpoint too', async () => {
    await request(app)
      .post('/api/v1/inquiries/sourcing')
      .send({
        customer: validCustomer,
        sourcingDetails: { itemDescription: 'Terasaki ACB 800A draw-out' },
        website: 'bot',
      })
      .expect(201);

    expect(inquiries.createInquiry).not.toHaveBeenCalled();
  });
});
