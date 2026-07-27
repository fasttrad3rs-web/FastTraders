import * as XLSX from 'xlsx';

/**
 * Spreadsheet helpers built on SheetJS.
 * One implementation serves both CSV and XLSX so exports stay consistent.
 */

export type SheetFormat = 'csv' | 'xlsx';

export interface SheetFile {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

const CONTENT_TYPES: Record<SheetFormat, string> = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/** Widen columns to roughly fit their content — Excel's default is unusable. */
function autoWidth(rows: Record<string, unknown>[], headers: string[]): XLSX.ColInfo[] {
  return headers.map((header) => {
    const longest = rows.reduce((max, row) => {
      const value = row[header];
      const text = typeof value === 'string' ? value : JSON.stringify(value) ?? '';
      return Math.max(max, value === null || value === undefined ? 0 : text.length);
    }, header.length);
    return { wch: Math.min(Math.max(longest + 2, 10), 60) };
  });
}

export function buildSheet(
  rows: Record<string, unknown>[],
  options: { format: SheetFormat; sheetName?: string; filenameBase: string },
): SheetFile {
  const { format, sheetName = 'Sheet1', filenameBase } = options;
  const headers = rows.length > 0 ? Object.keys(rows[0] ?? {}) : [];

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  worksheet['!cols'] = autoWidth(rows, headers);

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `${filenameBase}-${stamp}.${format}`;

  if (format === 'csv') {
    // Prefix a BOM so Excel opens UTF-8 (Rs., ², ×) correctly.
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    // U+FEFF byte-order mark so Excel opens the file as UTF-8.
    return { buffer: Buffer.from(`\uFEFF${csv}`, 'utf8'), filename, contentType: CONTENT_TYPES.csv };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  return { buffer, filename, contentType: CONTENT_TYPES.xlsx };
}

/** Multi-sheet workbook — used by the reports endpoint (summary + rows). */
export function buildWorkbook(
  sheets: { name: string; rows: Record<string, unknown>[] }[],
  filenameBase: string,
): SheetFile {
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const headers = sheet.rows.length > 0 ? Object.keys(sheet.rows[0] ?? {}) : [];
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows, { header: headers });
    worksheet['!cols'] = autoWidth(sheet.rows, headers);
    // Excel caps sheet names at 31 characters.
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return {
    buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer,
    filename: `${filenameBase}-${stamp}.xlsx`,
    contentType: CONTENT_TYPES.xlsx,
  };
}

/** Parse an uploaded CSV or XLSX buffer into raw rows. */
export function parseSheet(buffer: Buffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [];

  const worksheet = workbook.Sheets[firstSheet];
  if (!worksheet) return [];

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
}
