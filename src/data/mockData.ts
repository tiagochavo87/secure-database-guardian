export interface ColumnCategory {
  name: string;
  columns: string[];
}

export const COLUMN_CATEGORIES: ColumnCategory[] = [
  { name: "Demografia", columns: ["CÓDIGO", "IDADENAINCLUSÃO", "SEXO", "ETNIAAUTODECLARADA"] },
  { name: "Genética e Imunologia", columns: ["IL6", "IL17A", "IL22", "rs16944", "rs1143627"] },
  { name: "Desfechos", columns: ["Obito", "VentilacaoMecanica", "UTI", "TempoInternacao"] },
];

export const ALL_COLUMNS = COLUMN_CATEGORIES.flatMap((c) => c.columns);

export interface DataVersion {
  id: string;
  name: string;
  createdAt: string;
  rowCount: number;
  columnCount: number;
}

export type DataRow = Record<string, unknown>;

export const MOCK_VERSIONS: DataVersion[] = [
  { id: "v1", name: "v1.0 - Base Inicial", createdAt: "2025-06-15", rowCount: 150, columnCount: ALL_COLUMNS.length },
  { id: "v2", name: "v1.1 - Atualização Set/2025", createdAt: "2025-09-20", rowCount: 210, columnCount: ALL_COLUMNS.length },
  { id: "v3", name: "v2.0 - Revisão Março 2026", createdAt: "2026-03-01", rowCount: 280, columnCount: ALL_COLUMNS.length },
];
