import { detectFileType, resourceKindFor, verifyFileSignature } from '../utils/file-signature';

/**
 * The upload security boundary.
 *
 * `file.mimetype` comes from the uploader, so it is a claim. These tests pin
 * the thing that actually decides: the bytes.
 */

/** Minimal but real headers for each accepted format. */
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const PDF = Buffer.from('%PDF-1.7\n%\xe2\xe3\xcf\xd3\n', 'binary');
const DWG = Buffer.from('AC1027\x00\x00\x00\x00', 'binary');

const WEBP = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP', 'ascii'),
]);

/** A ZIP whose first entry names the OOXML manifest, as every xlsx does. */
const XLSX = Buffer.concat([
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.alloc(26),
  Buffer.from('[Content_Types].xml', 'ascii'),
]);

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

describe('detectFileType', () => {
  it.each([
    ['JPEG', JPEG, 'jpeg'],
    ['PNG', PNG, 'png'],
    ['WebP', WEBP, 'webp'],
    ['PDF', PDF, 'pdf'],
    ['DWG', DWG, 'dwg'],
    ['XLSX', XLSX, 'zip'],
  ])('recognises %s', (_label, buffer, expected) => {
    expect(detectFileType(buffer as Buffer)).toBe(expected);
  });

  it('rejects a plain ZIP that is not an Office document', () => {
    // `PK\x03\x04` alone would accept an archive of anything at all.
    const zip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(64)]);
    expect(detectFileType(zip)).toBeNull();
  });

  it.each([
    ['an HTML page', Buffer.from('<!DOCTYPE html><html><body>hi</body></html>')],
    ['a shell script', Buffer.from('#!/bin/sh\nrm -rf /\n')],
    ['an SVG', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>')],
    ['a PHP file', Buffer.from('<?php system($_GET["c"]); ?>')],
    ['an ELF binary', Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01])],
    ['an empty file', Buffer.alloc(0)],
  ])('refuses %s', (_label, buffer) => {
    expect(detectFileType(buffer)).toBeNull();
  });
});

describe('verifyFileSignature', () => {
  it('accepts a photo sent as a photo', () => {
    expect(verifyFileSignature(JPEG, 'image/jpeg').ok).toBe(true);
  });

  it('accepts a DWG arriving as octet-stream, which several browsers send', () => {
    expect(verifyFileSignature(DWG, 'application/octet-stream').ok).toBe(true);
  });

  it('accepts a spreadsheet', () => {
    expect(verifyFileSignature(XLSX, XLSX_MIME).ok).toBe(true);
  });

  it('refuses a PDF wearing a JPEG content type', () => {
    // The central case: the declared type is the attacker-controlled part.
    const result = verifyFileSignature(PDF, 'image/jpeg');
    expect(result.ok).toBe(false);
    expect(result.detected).toBe('pdf');
    expect(result.reason).toContain('sent as image/jpeg');
  });

  it('refuses a script dressed as a nameplate photo', () => {
    const script = Buffer.from('<?php system($_GET["c"]); ?>');
    const result = verifyFileSignature(script, 'image/png');
    expect(result.ok).toBe(false);
    expect(result.detected).toBeNull();
  });

  it('refuses an SVG even though it is an image', () => {
    // Cloudinary would serve it back as image/svg+xml, script and all.
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>');
    expect(verifyFileSignature(svg, 'image/svg+xml').ok).toBe(false);
  });

  it('refuses a real file whose MIME type is not on the list', () => {
    expect(verifyFileSignature(JPEG, 'image/gif').ok).toBe(false);
  });
});

describe('resourceKindFor', () => {
  it('stores photos as images so Cloudinary can transform them', () => {
    expect(resourceKindFor('jpeg')).toBe('image');
    expect(resourceKindFor('png')).toBe('image');
  });

  it('stores documents as raw, untouched bytes', () => {
    // Raw has no transformation surface. An `image` PDF keeps its bytes until
    // something asks for a transformation — and then returns a picture of page
    // one instead of the document, which is not a risk worth carrying on a
    // customer's drawing.
    expect(resourceKindFor('pdf')).toBe('raw');
    expect(resourceKindFor('dwg')).toBe('raw');
    expect(resourceKindFor('zip')).toBe('raw');
  });
});
