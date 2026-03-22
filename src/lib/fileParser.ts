import * as XLSX from "xlsx";

/**
 * Parse uploaded file (XLS, XLSX, CSV, TXT) into array of objects.
 * Detects header rows dynamically and handles locale numbers.
 */
export async function parseUploadedFile(file: File): Promise<Record<string, unknown>[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "txt") {
    const text = await file.text();
    return parseDelimitedText(text);
  }

  // XLS, XLSX and CSV: parse all sheets and pick the one with most valid rows
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
  const grid = XLSX.utils.sheet_to_json(sheet, {
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

function detectHeaderRow(rows: string[][]): number {
  const maxRowsToScan = Math.min(rows.length, 20);
  let bestIndex = -1;
  let bestScore = -1;

  for (let i = 0; i < maxRowsToScan; i++) {
    const current = rows[i];
    const nonEmpty = current.filter((c) => c !== "").length;
    if (nonEmpty < 2) continue;

    const textLike = current.filter((c) => /[A-Za-zÀ-ÿ_]/.test(c)).length;
    const hasDataBelow = rows.slice(i + 1, i + 6).some((r) => r.some((c) => c !== ""));
    const score = nonEmpty * 2 + textLike + (hasDataBelow ? 3 : 0);

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function makeUniqueHeaders(rawHeaders: string[]): string[] {
  const seen = new Map<string, number>();

  return rawHeaders.map((header, index) => {
    const base = normalizeHeaderLabel(header) || `coluna_${index + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

function normalizeHeaderLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCellValue(value: string): string | number | boolean {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const lower = trimmed.toLowerCase();
  if (["true", "yes", "sim", "s", "1"].includes(lower)) return true;
  if (["false", "no", "nao", "não", "n", "0"].includes(lower)) return false;

  const numeric = parseNumericValue(trimmed);
  if (numeric !== null) return numeric;

  return trimmed;
}

function parseNumericValue(input: string): number | null {
  const normalized = input.replace(/\s/g, "");

  // 1.234,56
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(normalized)) {
    const n = Number(normalized.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  // 1,234.56
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(normalized)) {
    const n = Number(normalized.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  // 1234,56
  if (/^-?\d+(,\d+)$/.test(normalized)) {
    const n = Number(normalized.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  // 1234.56 or 1234
  if (/^-?\d+(\.\d+)?$/.test(normalized)) {
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

function parseDelimitedText(text: string): Record<string, unknown>[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  if (lines.length < 2) return [];

  const separator = detectSeparator(lines[0]);
  const headers = makeUniqueHeaders(splitDelimitedLine(lines[0], separator));

  return lines.slice(1).map((line) => {
    const values = splitDelimitedLine(line, separator);
    const row: Record<string, unknown> = {};

    headers.forEach((header, index) => {
      row[header] = parseCellValue(values[index] ?? "");
    });

    return row;
  });
}

function detectSeparator(headerLine: string): string {
  if (headerLine.includes("\t")) return "\t";
  if (headerLine.includes(";")) return ";";
  return ",";
}

function splitDelimitedLine(line: string, separator: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === separator && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

