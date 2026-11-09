/**
 * CSV helpers for exports opened in spreadsheet apps.
 *
 * Every cell is quoted, so commas, quotes and line breaks are safe. Cells that a
 * spreadsheet would read as a formula (`= + - @`, or a leading tab / carriage
 * return) get a leading apostrophe, which Excel, Sheets and LibreOffice display
 * as plain text. This blocks CSV/formula injection through names or emails.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function csvRow(values: unknown[]): string {
  return `${values.map(csvCell).join(",")}\r\n`;
}

/** UTF-8 byte-order mark: makes Excel open non-ASCII names correctly. */
export const CSV_BOM = "\uFEFF";

/** ASCII fallback plus an RFC 5987 UTF-8 filename for Content-Disposition. */
export function attachmentHeader(filename: string): string {
  const ascii = filename.normalize("NFKD").replace(/[^\x20-\x7e]/g, "").replace(/["\/]/g, "").replace(/\s+/g, "-") || "export.csv";
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
