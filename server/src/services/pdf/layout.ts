import PDFDocument from 'pdfkit';
import { BUSINESS, COLORS, PAGE, formatDate } from './theme';

/**
 * Reusable PDF building blocks: letterhead, meta panel, item table, totals and
 * footer. Both the invoice and the formal quotation are composed from these,
 * so the two documents cannot drift apart visually.
 */

export type Doc = InstanceType<typeof PDFDocument>;

export function createDocument(title: string, subject: string): Doc {
  return new PDFDocument({
    size: PAGE.size,
    margin: PAGE.margin,
    bufferPages: true,
    info: {
      Title: title,
      Author: BUSINESS.name,
      Subject: subject,
      Creator: `${BUSINESS.name} — ${BUSINESS.website}`,
    },
  });
}

/** Collect a document into a single Buffer. */
export function toBuffer(doc: Doc): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

/** Navy letterhead band with the full business card details. */
export function drawLetterhead(doc: Doc, documentLabel: string): void {
  const { margin, contentWidth } = PAGE;

  doc.rect(0, 0, 595.28, 108).fill(COLORS.navy);
  // Cyan keyline echoes the accent used across the site.
  doc.rect(0, 108, 595.28, 3).fill(COLORS.cyan);

  doc
    .fillColor(COLORS.white)
    .font('Helvetica-Bold')
    .fontSize(24)
    .text(BUSINESS.name, margin, 26, { characterSpacing: 1.5 });

  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor(COLORS.cyan)
    .text(BUSINESS.tagline.toUpperCase(), margin, 55, { characterSpacing: 0.4 });

  doc
    .fillColor(COLORS.white)
    .fontSize(7.5)
    .text(BUSINESS.address, margin, 70)
    .text(
      `Mobile / WhatsApp ${BUSINESS.mobile}   |   Landline ${BUSINESS.landline}`,
      margin,
      81,
    )
    .text(`${BUSINESS.email}   |   ${BUSINESS.website}`, margin, 92);

  // Document label, right-aligned in the band.
  doc
    .font('Helvetica-Bold')
    .fontSize(15)
    .fillColor(COLORS.white)
    .text(documentLabel.toUpperCase(), margin, 30, { width: contentWidth, align: 'right' });

  doc.y = 130;
  doc.fillColor(COLORS.ink);
}

export interface MetaColumn {
  heading: string;
  lines: string[];
}

/** Two-column panel: "Bill To" on the left, document meta on the right. */
export function drawMetaPanel(doc: Doc, left: MetaColumn, right: MetaColumn): void {
  const { margin, contentWidth } = PAGE;
  const top = doc.y;
  const colWidth = contentWidth / 2 - 10;
  const rightX = margin + contentWidth / 2 + 10;

  const column = (col: MetaColumn, x: number): number => {
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(col.heading.toUpperCase(), x, top, { width: colWidth, characterSpacing: 0.6 });

    let y = top + 13;
    for (const line of col.lines) {
      doc.font('Helvetica').fontSize(9).fillColor(COLORS.ink).text(line, x, y, { width: colWidth });
      y = doc.y + 1;
    }
    return y;
  };

  const leftBottom = column(left, margin);
  const rightBottom = column(right, rightX);

  doc.y = Math.max(leftBottom, rightBottom) + 14;
}

/** Footer with page numbers, stamped on every buffered page at the end. */
export function drawFooters(doc: Doc, generatedAt: Date): void {
  const range = doc.bufferedPageRange();

  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);

    // The footer sits below the bottom margin. Without this, pdfkit treats the
    // write as an overflow and helpfully adds a blank page for every footer.
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    const y = 795;

    doc
      .moveTo(PAGE.margin, y)
      .lineTo(PAGE.margin + PAGE.contentWidth, y)
      .strokeColor(COLORS.line)
      .lineWidth(0.5)
      .stroke();

    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(COLORS.muted)
      .text(`${BUSINESS.name}  \u00b7  ${BUSINESS.address}  \u00b7  ${BUSINESS.mobile}`, PAGE.margin, y + 7, {
        width: PAGE.contentWidth * 0.7,
        lineBreak: false,
      })
      .text(
        `Generated ${formatDate(generatedAt)}   Page ${i - range.start + 1} of ${range.count}`,
        PAGE.margin,
        y + 7,
        { width: PAGE.contentWidth, align: 'right', lineBreak: false },
      );

    doc.page.margins.bottom = bottomMargin;
  }

  // Nothing must be written after the footers, or the page count goes stale.
  doc.flushPages();
}
