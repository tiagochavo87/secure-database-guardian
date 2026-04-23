/**
 * LGPD Data Masking Utility
 * Masks identifying columns for non-admin users.
 * Admins see full data; regular users see masked values.
 */

// Columns that are considered identifying (case-insensitive partial match)
const IDENTIFYING_PATTERNS = [
  "nome", "name", "paciente", "patient",
  "cpf", "rg", "identidade", "identity",
  "endereco", "endereço", "address",
  "telefone", "phone", "celular",
  "email", "e-mail", "mail",
  "nascimento", "birth", "data_nasc",
  "mae", "mãe", "pai", "mother", "father",
  "sus", "prontuario", "prontuário", "registro",
  "cns", // Cartão Nacional de Saúde
];

export function isIdentifyingColumn(columnName: string): boolean {
  const lower = columnName.toLowerCase().replace(/[_\-\s]/g, "");
  return IDENTIFYING_PATTERNS.some((pattern) =>
    lower.includes(pattern.replace(/[_\-\s]/g, ""))
  );
}

export function maskValue(value: unknown): string {
  if (value == null) return "—";
  const str = String(value);
  if (str.length <= 2) return "***";
  // Show first and last char, mask the rest
  return str[0] + "*".repeat(Math.min(str.length - 2, 8)) + str[str.length - 1];
}

export function getIdentifyingColumns(columns: string[]): string[] {
  return columns.filter(isIdentifyingColumn);
}

export function maskRow(
  row: Record<string, unknown>,
  identifyingCols: Set<string>,
  isAdmin: boolean
): Record<string, unknown> {
  if (isAdmin) return row;
  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    masked[key] = identifyingCols.has(key) ? maskValue(value) : value;
  }
  return masked;
}

export function maskDataset(
  data: Record<string, unknown>[],
  isAdmin: boolean
): Record<string, unknown>[] {
  if (isAdmin || data.length === 0) return data;
  const allCols = Object.keys(data[0]);
  const idCols = new Set(getIdentifyingColumns(allCols));
  if (idCols.size === 0) return data;
  return data.map((row) => maskRow(row, idCols, false));
}
