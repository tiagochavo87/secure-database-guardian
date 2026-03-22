import * as XLSX from "xlsx";

export async function parseUploadedFile(file: File): Promise<Record<string, unknown>[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "txt") {
    const text = await file.text();
    return parseDelimitedText(text);
  }

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array", raw: false });

  let bestRows: Record<string, unknown>[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = parseSheet(sheet);
    if (rows.length > bestRows.length) bestRows = rows;
  }

  return bestRows;
}

function parseSheet(sheet: XLSX.WorkSheet): Record<string, unknown>[] {
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  }) as unknown[][];

  const rows = grid
    .map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "").trim()) : []))
    .filter((row) => row.some((cell) => cell !== ""));

  if (rows.length < 2) return [];

  const headerIndex = detectHeaderRow(rows);
  if (headerIndex === -1) return [];

  const headers = makeUniqueHeaders(rows[headerIndex]);
  const dataRows = rows.slice(headerIndex + 1).filter((row) => row.some((cell) => cell !== ""));

  return dataRows.map((row) => {
    const record: Record<string, unknown> = {};
    headers.forEach((header, colIndex) => {
      record[header] = parseCellValue(row[colIndex] ?? "");
    });
    return record;
  });
}

function parseDelimitedText(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length < 2) return [];

  let sep = "\t";
  const tabCount = (lines[0].match(/\t/g) || []).length;
  const commaCount = (lines[0].match(/,/g) || []).length;
  const semiCount = (lines[0].match(/;/g) || []).length;
  if (commaCount > tabCount && commaCount > semiCount) sep = ",";
  else if (semiCount > tabCount) sep = ";";

  const headers = makeUniqueHeaders(lines[0].split(sep).map(h => h.trim()));
  return lines.slice(1).map(line => {
    const parts = line.split(sep);
    const record: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      record[h] = parseCellValue(parts[i]?.trim() ?? "");
    });
    return record;
  }).filter(row => Object.values(row).some(v => v !== ""));
}

function detectHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    const nonEmpty = row.filter(c => c !== "").length;
    if (nonEmpty < 2) continue;
    const numericCount = row.filter(c => c !== "" && !isNaN(Number(c))).length;
    if (numericCount / nonEmpty < 0.5) return i;
  }
  return 0;
}

function makeUniqueHeaders(raw: string[]): string[] {
  const counts: Record<string, number> = {};
  return raw.map(h => {
    const clean = (h || "col").replace(/[^\w\s]/g, "").trim() || "col";
    counts[clean] = (counts[clean] || 0) + 1;
    return counts[clean] > 1 ? `${clean}_${counts[clean]}` : clean;
  });
}

function parseCellValue(val: string): unknown {
  if (val === "" || val === "NA" || val === "N/A" || val === "NULL" || val === "null") return "";
  const cleaned = val.replace(",", ".");
  const num = Number(cleaned);
  if (!isNaN(num) && cleaned.trim() !== "") return num;
  return val;
}
