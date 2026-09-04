import request from 'supertest';

/**
 * Sourcing requests, including attachments.
 *
 * Split from `inquiry.public.test.ts` on length. Only the Cloudinary network
 * hop is stubbed — `attachment.service` and the signature check run for real,
 * because the upload boundary is the part worth testing.
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
  stubInquiryServices,
  validCustomer,
  type InquiryReply,
} from './helpers/inquiry-fixtures';

const app = createApp();

beforeEach(stubInquiryServices);

describe('POST /api/v1/inquiries/sourcing', () => {
  it('records a sourcing request without a shortlist', async () => {
    const response = await request(app)
      .post('/api/v1/inquiries/sourcing')
      .send({
        customer: validCustomer,
        sourcingDetails: {
          itemDescription: 'Terasaki AR208S 800A draw-out ACB',
          preferredBrand: 'Terasaki',
          urgency: 'urgent',
        },
      })
      .expect(201);

    expect(envelope<InquiryReply>(response).data.inquiryNumber).toBe('FT-INQ-202607-0001');
    const [args] = inquiries.createInquiry.mock.calls[0] ?? [];
    expect(args?.type).toBe('sourcing_request');
  });

  it('reports how many attachments were stored', async () => {
    // A JSON submission carries none, and the reply must say so rather than
    // implying we received a file the customer thinks they attached.
    const response = await request(app)
      .post('/api/v1/inquiries/sourcing')
      .send({
        customer: validCustomer,
        sourcingDetails: { itemDescription: 'Nameplate photo to follow by WhatsApp' },
      })
      .expect(201);

    const body = envelope<InquiryReply>(response);
    expect(body.data.attachmentsAccepted).toBe(0);
    expect(body.data.attachmentsRejected).toEqual([]);
  });

  it('accepts a multipart submission with a real photo attached', async () => {
    // The shape the form actually posts: one JSON `payload` part plus files.
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

    const response = await request(app)
      .post('/api/v1/inquiries/sourcing')
      .field(
        'payload',
        JSON.stringify({
          customer: validCustomer,
          sourcingDetails: { itemDescription: 'Terasaki ACB, nameplate attached' },
        }),
      )
      .attach('attachments', jpeg, { filename: 'nameplate.jpg', contentType: 'image/jpeg' })
      .expect(201);

    expect(envelope<InquiryReply>(response).data.attachmentsAccepted).toBe(1);
    const [args] = inquiries.createInquiry.mock.calls[0] ?? [];
    expect(args?.sourcingDetails?.referenceFiles).toHaveLength(1);
  });

  it('refuses a file whose bytes do not match its declared type', async () => {
    /*
     * The central upload attack: a script sent as `image/jpeg`. Multer's MIME
     * filter waves it through because the header is attacker-controlled — the
     * signature check is what stops it. The inquiry is still recorded, because
     * the text is the lead; only the file is dropped.
     */
    const script = Buffer.from('<?php system($_GET["c"]); ?>');

    const response = await request(app)
      .post('/api/v1/inquiries/sourcing')
      .field(
        'payload',
        JSON.stringify({
          customer: validCustomer,
          sourcingDetails: { itemDescription: 'A perfectly ordinary request' },
        }),
      )
      .attach('attachments', script, { filename: 'photo.jpg', contentType: 'image/jpeg' })
      .expect(201);

    const body = envelope<InquiryReply>(response);
    expect(body.data.attachmentsAccepted).toBe(0);
    expect(body.data.attachmentsRejected).toHaveLength(1);
    expect(inquiries.createInquiry).toHaveBeenCalled();
  });

  it('rejects a multipart submission with no payload part', async () => {
    await request(app)
      .post('/api/v1/inquiries/sourcing')
      .attach('attachments', Buffer.from('x'), 'note.txt')
      .expect(400);
  });

  it('needs a description of what they are looking for', async () => {
    await request(app)
      .post('/api/v1/inquiries/sourcing')
      .send({ customer: validCustomer, sourcingDetails: { itemDescription: 'x' } })
      .expect(422);
  });
});
