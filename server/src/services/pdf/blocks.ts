import { COLORS, PAGE } from './theme';
import type { Doc } from './layout';

/** Content blocks shared by the invoice and the quotation. */

export interface TableColumn {
  header: string;
  width: number;
  align?: 'left' | 'right' | 'center';
}

export interface TableRow {
  cells: string[];
  /** Secondary line under the first cell, e.g. the SKU. */
  subLabel?: string;
}

/**
 * Item table with a header band, zebra striping and page-break handling.
 *
 * Every block snapshots its own top and then *assigns* `doc.y` rather than
 * incrementing it — `doc.text()` advances the cursor itself, so `+=` would
 * double-count and push content onto phantom extra pages.
 */
export function drawTable(doc: Doc, columns: TableColumn[], rows: TableRow[]): void {
  const { margin } = PAGE;
  const headerHeight = 22;

  const drawHeader = (): void => {
    const top = doc.y;
    doc.rect(margin, top, PAGE.contentWidth, headerHeight).fill(COLORS.navy);

    let x = margin + 8;
    columns.forEach((col) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(COLORS.white)
        .text(col.header.toUpperCase(), x, top + 7, {
          width: col.width - 16,
          align: col.align ?? 'left',
          lineBreak: false,
        });
      x += col.width;
    });

    doc.y = top + headerHeight;
  };

  drawHeader();

  rows.forEach((row, index) => {
    const rowHeight = row.subLabel ? 30 : 21;

    // Leave room for the totals block; start a fresh page with a new header.
    if (doc.y + rowHeight > 700) {
      doc.addPage();
      doc.y = PAGE.margin;
      drawHeader();
    }

    const top = doc.y;

    if (index % 2 === 1) {
      doc.rect(margin, top, PAGE.contentWidth, rowHeight).fill(COLORS.surface);
    }

    let x = margin + 8;
    row.cells.forEach((cell, cellIndex) => {
      const col = columns[cellIndex];
      if (!col) return;
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLORS.ink)
        // `height` clamps the cell to a single line; a long product name is
        // truncated with an ellipsis rather than wrapping over its SKU label.
        .text(cell, x, top + 6, {
          width: col.width - 16,
          height: 11,
          align: col.align ?? 'left',
          ellipsis: true,
        });
      x += col.width;
    });

    if (row.subLabel) {
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(COLORS.muted)
        .text(row.subLabel, margin + 8, top + 18, {
          width: PAGE.contentWidth - 16,
          lineBreak: false,
          ellipsis: true,
        });
    }

    doc.y = top + rowHeight;
    doc
      .moveTo(margin, doc.y)
      .lineTo(margin + PAGE.contentWidth, doc.y)
      .strokeColor(COLORS.line)
      .lineWidth(0.5)
      .stroke();
  });

  doc.y += 10;
}

export interface TotalLine {
  label: string;
  value: string;
  emphasise?: boolean;
}

/** Right-aligned totals stack; the emphasised line gets a navy band. */
export function drawTotals(doc: Doc, lines: TotalLine[]): void {
  const { margin, contentWidth } = PAGE;
  const boxWidth = 250;
  const x = margin + contentWidth - boxWidth;

  lines.forEach((line) => {
    const height = line.emphasise ? 26 : 18;
    const top = doc.y;

    if (line.emphasise) {
      doc.rect(x, top, boxWidth, height).fill(COLORS.navy);
    }

    const textY = top + (line.emphasise ? 8 : 4);
    doc
      .font(line.emphasise ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(line.emphasise ? 11 : 9.5)
      .fillColor(line.emphasise ? COLORS.white : COLORS.muted)
      .text(line.label, x + 10, textY, { width: boxWidth / 2 - 10, lineBreak: false });

    doc
      .font('Helvetica-Bold')
      .fontSize(line.emphasise ? 11 : 9.5)
      .fillColor(line.emphasise ? COLORS.white : COLORS.ink)
      .text(line.value, x + boxWidth / 2, textY, {
        width: boxWidth / 2 - 12,
        align: 'right',
        lineBreak: false,
      });

    doc.y = top + height;
  });

  doc.y += 8;
}

/** Notes / terms block. */
export function drawNotes(doc: Doc, heading: string, lines: string[]): void {
  if (lines.length === 0) return;
  const { margin, contentWidth } = PAGE;

  if (doc.y > 690) {
    doc.addPage();
    doc.y = PAGE.margin;
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(heading.toUpperCase(), margin, doc.y, { characterSpacing: 0.6 });

  doc.y += 3;
  lines.forEach((line) => {
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(COLORS.ink)
      .text(`•  ${line}`, margin, doc.y, { width: contentWidth, lineGap: 1 });
  });

  doc.y += 8;
}

