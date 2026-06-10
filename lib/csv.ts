/**
 * Converts report rows into CSV text that spreadsheet programs such as Excel can open.
 */
export function toCsv(rows: Array<Record<string, string | number | null | undefined>>) {
  if (!rows.length) return "";

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(","))
  ];

  return lines.join("\r\n");
}

/**
 * Packages CSV text as a downloadable HTTP response with the requested filename.
 */
export function csvResponse(filename: string, csv: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}

/**
 * Safely quotes a CSV value when it contains commas, quotes, or line breaks.
 */
function escapeCsvValue(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}
