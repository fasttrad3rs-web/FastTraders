/**
 * File type detection from the bytes, not from what the client claimed.
 *
 * `file.mimetype` is taken verbatim from the multipart `Content-Type` header,
 * which the uploader writes. Anyone can send `Content-Type: image/jpeg` with a
 * PHP script or an HTML file as the body, and Multer's `fileFilter` will wave
 * it through — the filter is a convenience for honest clients, never a control.
 *
 * So every accepted format is confirmed against its signature before the buffer
 * goes anywhere. The formats here are the ones a sourcing request actually
 * arrives as: a phone photo of a nameplate, a datasheet, a drawing, a BOM.
 *
 * Deliberately NOT accepted: SVG. It is XML, it can carry script, and Cloudinary
 * will serve it back with an image content type — a stored-XSS delivery
 * mechanism dressed as a nameplate photo. Nobody sends a drawing as SVG anyway.
 */

export type DetectedType = 'jpeg' | 'png' | 'webp' | 'pdf' | 'zip' | 'dwg';

interface Signature {
  type: DetectedType;
  /** Byte offset the pattern starts at. */
  offset: number;
  bytes: number[];
}

const SIGNATURES: Signature[] = [
  { type: 'jpeg', offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { type: 'png', offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: 'pdf', offset: 0, bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
  // XLSX is a ZIP container. `PK\x03\x04` is as far as a signature check goes;
  // the sheet check below confirms it is actually a spreadsheet.
  { type: 'zip', offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },
  // AutoCAD: "AC" followed by a four-digit version, e.g. AC1027 for 2013.
  { type: 'dwg', offset: 0, bytes: [0x41, 0x43, 0x31, 0x30] },
  { type: 'dwg', offset: 0, bytes: [0x41, 0x43, 0x31, 0x30, 0x31] },
];

function matches(buffer: Buffer, signature: Signature): boolean {
  if (buffer.length < signature.offset + signature.bytes.length) return false;
  return signature.bytes.every((byte, index) => buffer[signature.offset + index] === byte);
}

/** WebP is RIFF....WEBP — the container tag sits at offset 8. */
function isWebp(buffer: Buffer): boolean {
  return (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  );
}

/**
 * Is this ZIP an Office document rather than an arbitrary archive?
 *
 * A bare `PK\x03\x04` check would accept any zip, including one full of
 * executables. Every OOXML file names `[Content_Types].xml` as its first entry,
 * which appears in the clear right after the local file header.
 */
function isOoxml(buffer: Buffer): boolean {
  return buffer.subarray(0, 512).includes(Buffer.from('[Content_Types].xml'));
}

/** The detected type, or `null` when nothing recognised the bytes. */
export function detectFileType(buffer: Buffer): DetectedType | null {
  if (isWebp(buffer)) return 'webp';

  for (const signature of SIGNATURES) {
    if (!matches(buffer, signature)) continue;
    if (signature.type === 'zip') return isOoxml(buffer) ? 'zip' : null;
    return signature.type;
  }
  return null;
}

/** Which detected types each declared MIME type is allowed to turn out to be. */
const MIME_EXPECTATIONS: Record<string, DetectedType[]> = {
  'image/jpeg': ['jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'application/pdf': ['pdf'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['zip'],
  'application/vnd.ms-excel': ['zip'],
  // Browsers disagree about DWG: Chrome usually sends the first, Safari the
  // second, and several send nothing at all and fall back to octet-stream.
  'image/vnd.dwg': ['dwg'],
  'application/acad': ['dwg'],
  'application/octet-stream': ['dwg'],
};

export interface SignatureCheck {
  ok: boolean;
  detected: DetectedType | null;
  reason?: string;
}

/**
 * Confirm the bytes match the declared MIME type.
 *
 * Both must pass: an unrecognised file is rejected, and so is a recognised one
 * that is not what it said it was — a PDF renamed to `.jpg` is a mislabelled
 * file at best and a probe at worst, and either way staff opening it expect a
 * photo.
 */
export function verifyFileSignature(
  buffer: Buffer,
  declaredMime: string,
): SignatureCheck {
  const detected = detectFileType(buffer);

  if (!detected) {
    return { ok: false, detected: null, reason: 'the file content is not a supported format' };
  }

  const expected = MIME_EXPECTATIONS[declaredMime];
  if (!expected) {
    return { ok: false, detected, reason: `${declaredMime} is not an accepted type` };
  }

  if (!expected.includes(detected)) {
    return {
      ok: false,
      detected,
      reason: `content is ${detected} but was sent as ${declaredMime}`,
    };
  }

  return { ok: true, detected };
}

/** Cloudinary stores photos as images and everything else as opaque bytes. */
export function resourceKindFor(detected: DetectedType): 'image' | 'raw' {
  return detected === 'jpeg' || detected === 'png' || detected === 'webp' ? 'image' : 'raw';
}
