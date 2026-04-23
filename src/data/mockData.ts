export interface ColumnCategory {
  name: string;
  columns: string[];
}

export const COLUMN_CATEGORIES: ColumnCategory[] = [
  {
    name: "Demografia",
    columns: ["CÓDIGO", "IDADENAINCLUSÃO", "SEXO", "ETNIAAUTODECLARADA", "PESOkg", "ALTURAm", "IMC", "GRUPOSANGUÍNEOABO", "FATORRh", "Etnia_vd", "Tipo_sangue_vd", "RH_vd"],
  },
  {
    name: "Genética e Imunologia",
    columns: ["IL6", "IL17A", "IL22", "IL17F", "IL4", "IL10", "IL2", "rs16944", "rs1143627", "rs1143629"],
  },
  {
    name: "Desfechos e Internação",
    columns: ["Obito", "VentilacaoMecanica", "UTI", "TempoInternacao", "N_Sintomas"],
  },
  {
    name: "Sintomas e Comorbidades",
    columns: ["Cansaco", "Dores", "Febre", "DorGarganta", "Tosse", "Dispneia", "PerdaOlfatoPaladar", "Comorbidades", "HAS", "DM", "Obesidade", "Dislipidemia", "DoencaPulmonar", "DoencaAutoimune", "DoencaCardiaca", "IST", "Tabagista", "Elitista", "Cancer", "ProblemasHormonais", "DisturbiosPsiquiatricos", "ComprometimentoPulmonar"],
  },
  {
    name: "Exames Hematológicos",
    columns: ["Hemacia_vd", "HbDurante_vd", "HtDurante_vd", "VCMDurante_vd", "HCMDurante_vd", "CHCMDurante_vd", "RDWDurante_vd", "LeucocitosDurante_vd", "NeutrofilosDurante_vd", "NeutSegDurante_vd", "LinfocitosDurante_vd", "EosinofilosDurante_vd", "BasofilosDurante_vd", "MonocitosDurante_vd", "PlaquetasDurante_vd"],
  },
  {
    name: "Exames Bioquímicos",
    columns: ["GlicoseDurante_vd", "PASDurante_vd", "PADDurante_vd", "PCRDurante_vd", "DDimeroDurante_vd", "SodioDurante_vd", "PotassioDurante_vd", "MagnesioDurante_vd", "CreatininaDurante_vd", "UreiaDurante_vd", "LactatoDurante_vd", "TGODurante_vd", "TGPDurante_vd", "BTDurante_vd", "BIDurante_vd", "BDDurante_vd", "LDHDurante_vd"],
  },
  {
    name: "Gasometria e Oxigenação",
    columns: ["RNODurante_vd", "PHDurante_vd", "pCO2Durante_vd", "TCO2Durante_vd", "pO2Durante_vd", "HCO3Durante_vd", "BEDurante_vd", "pO2_fiO2Durante_vd", "SaturacaoO2Durante_vd"],
  },
  {
    name: "Índices e Biomarcadores",
    columns: ["NLRDurante_vd", "PLRDurante_vd", "MLRDurante_vd", "HematologicalBiomarkers", "LeucogramBiomarkers", "BiochemicalBiomarkers", "InflammationBiomarkers", "ArterialBloodGasBiomarkers", "OxygenationBiomarkers", "ElectrolytesBiomarkers"],
  },
];

export const ALL_COLUMNS = COLUMN_CATEGORIES.flatMap((c) => c.columns);

export interface DataVersion {
  id: string;
  name: string;
  createdAt: string;
  rowCount: number;
  columnCount: number;
}

export type DataRow = Record<string, string | number | null>;

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number, decimals = 0): number {
  const v = Math.random() * (max - min) + min;
  return Number(v.toFixed(decimals));
}

function generateRow(id: number): DataRow {
  const sexo = randomChoice(["M", "F"]);
  const peso = rand(50, 120, 1);
  const altura = rand(1.5, 1.95, 2);
  const imc = Number((peso / (altura * altura)).toFixed(1));
  const obito = randomChoice([0, 0, 0, 1]);
  const uti = obito === 1 ? randomChoice([0, 1, 1]) : randomChoice([0, 0, 1]);

  return {
    CÓDIGO: id,
    IDADENAINCLUSÃO: rand(18, 90),
    SEXO: sexo,
    ETNIAAUTODECLARADA: randomChoice(["Branca", "Parda", "Preta", "Amarela", "Indígena"]),
    PESOkg: peso,
    ALTURAm: altura,
    IMC: imc,
    GRUPOSANGUÍNEOABO: randomChoice(["A", "B", "AB", "O"]),
    FATORRh: randomChoice(["Positivo", "Negativo"]),
    Etnia_vd: rand(1, 5),
    Tipo_sangue_vd: rand(1, 4),
    RH_vd: rand(0, 1),
    IL6: rand(0, 500, 2),
    IL17A: rand(0, 200, 2),
    IL22: rand(0, 150, 2),
    IL17F: rand(0, 100, 2),
    IL4: rand(0, 50, 2),
    IL10: rand(0, 300, 2),
    IL2: rand(0, 100, 2),
    rs16944: randomChoice(["AA", "AG", "GG"]),
    rs1143627: randomChoice(["CC", "CT", "TT"]),
    rs1143629: randomChoice(["AA", "AC", "CC"]),
    Obito: obito,
    VentilacaoMecanica: uti === 1 ? randomChoice([0, 1]) : 0,
    UTI: uti,
    TempoInternacao: rand(1, 60),
    N_Sintomas: rand(0, 10),
    Cansaco: randomChoice([0, 1]),
    Dores: randomChoice([0, 1]),
    Febre: randomChoice([0, 1, 1]),
    DorGarganta: randomChoice([0, 1]),
    Tosse: randomChoice([0, 1, 1]),
    Dispneia: randomChoice([0, 1]),
    PerdaOlfatoPaladar: randomChoice([0, 1]),
    Comorbidades: rand(0, 5),
    HAS: randomChoice([0, 1]),
    DM: randomChoice([0, 1]),
    Obesidade: imc >= 30 ? 1 : 0,
    Dislipidemia: randomChoice([0, 1]),
    DoencaPulmonar: randomChoice([0, 0, 1]),
    DoencaAutoimune: randomChoice([0, 0, 0, 1]),
    DoencaCardiaca: randomChoice([0, 0, 1]),
    IST: randomChoice([0, 0, 0, 1]),
    Tabagista: randomChoice([0, 0, 1]),
    Elitista: randomChoice([0, 0, 1]),
    Cancer: randomChoice([0, 0, 0, 1]),
    ProblemasHormonais: randomChoice([0, 0, 0, 1]),
    DisturbiosPsiquiatricos: randomChoice([0, 0, 0, 1]),
    ComprometimentoPulmonar: randomChoice([0, 1]),
    Hemacia_vd: rand(3.5, 6.0, 2),
    HbDurante_vd: rand(8, 18, 1),
    HtDurante_vd: rand(25, 55, 1),
    VCMDurante_vd: rand(70, 100, 1),
    HCMDurante_vd: rand(24, 34, 1),
    CHCMDurante_vd: rand(30, 37, 1),
    RDWDurante_vd: rand(11, 20, 1),
    LeucocitosDurante_vd: rand(3000, 20000),
    NeutrofilosDurante_vd: rand(1500, 15000),
    NeutSegDurante_vd: rand(1000, 12000),
    LinfocitosDurante_vd: rand(500, 4000),
    EosinofilosDurante_vd: rand(0, 500),
    BasofilosDurante_vd: rand(0, 100),
    MonocitosDurante_vd: rand(100, 1500),
    PlaquetasDurante_vd: rand(100000, 450000),
    GlicoseDurante_vd: rand(60, 400),
    PASDurante_vd: rand(90, 200),
    PADDurante_vd: rand(50, 120),
    PCRDurante_vd: rand(0, 300, 1),
    DDimeroDurante_vd: rand(0, 10000),
    SodioDurante_vd: rand(130, 150, 1),
    PotassioDurante_vd: rand(3.0, 6.0, 1),
    MagnesioDurante_vd: rand(1.5, 3.0, 1),
    CreatininaDurante_vd: rand(0.5, 10, 2),
    UreiaDurante_vd: rand(10, 200),
    LactatoDurante_vd: rand(0.5, 10, 1),
    TGODurante_vd: rand(10, 500),
    TGPDurante_vd: rand(10, 500),
    BTDurante_vd: rand(0.1, 5, 1),
    BIDurante_vd: rand(0.1, 4, 1),
    BDDurante_vd: rand(0, 2, 1),
    LDHDurante_vd: rand(100, 1000),
    RNODurante_vd: rand(0.8, 3.0, 1),
    PHDurante_vd: rand(7.2, 7.55, 2),
    pCO2Durante_vd: rand(20, 60, 1),
    TCO2Durante_vd: rand(15, 35, 1),
    pO2Durante_vd: rand(40, 120, 1),
    HCO3Durante_vd: rand(15, 32, 1),
    BEDurante_vd: rand(-10, 10, 1),
    pO2_fiO2Durante_vd: rand(50, 500, 1),
    SaturacaoO2Durante_vd: rand(70, 100, 1),
    NLRDurante_vd: rand(0.5, 30, 2),
    PLRDurante_vd: rand(50, 500, 1),
    MLRDurante_vd: rand(0.1, 2, 2),
    HematologicalBiomarkers: rand(0, 3),
    LeucogramBiomarkers: rand(0, 3),
    BiochemicalBiomarkers: rand(0, 5),
    InflammationBiomarkers: rand(0, 3),
    ArterialBloodGasBiomarkers: rand(0, 3),
    OxygenationBiomarkers: rand(0, 2),
    ElectrolytesBiomarkers: rand(0, 2),
  };
}

function generateDataset(count: number): DataRow[] {
  return Array.from({ length: count }, (_, i) => generateRow(i + 1));
}

export const MOCK_VERSIONS: DataVersion[] = [
  { id: "v1", name: "v1.0 - Base Inicial", createdAt: "2025-06-15", rowCount: 150, columnCount: ALL_COLUMNS.length },
  { id: "v2", name: "v1.1 - Atualização Set/2025", createdAt: "2025-09-20", rowCount: 210, columnCount: ALL_COLUMNS.length },
  { id: "v3", name: "v2.0 - Revisão Março 2026", createdAt: "2026-03-01", rowCount: 280, columnCount: ALL_COLUMNS.length },
];

const versionDataCache: Record<string, DataRow[]> = {};

export function getVersionData(versionId: string): DataRow[] {
  if (!versionDataCache[versionId]) {
    const version = MOCK_VERSIONS.find((v) => v.id === versionId);
    versionDataCache[versionId] = generateDataset(version?.rowCount ?? 150);
  }
  return versionDataCache[versionId];
}

export function getDashboardStats(data: DataRow[]) {
  const total = data.length;
  const obitos = data.filter((r) => r.Obito === 1).length;
  const utiCount = data.filter((r) => r.UTI === 1).length;
  const avgTempo = data.reduce((s, r) => s + (Number(r.TempoInternacao) || 0), 0) / total;

  const symptomKeys = ["Febre", "Tosse", "Dispneia", "Cansaco", "Dores", "DorGarganta", "PerdaOlfatoPaladar"];
  const symptomFreq = symptomKeys.map((k) => ({
    name: k,
    count: data.filter((r) => r[k] === 1).length,
  }));

  return {
    totalPacientes: total,
    taxaUTI: ((utiCount / total) * 100).toFixed(1),
    taxaObito: ((obitos / total) * 100).toFixed(1),
    mediaInternacao: avgTempo.toFixed(1),
    symptomFreq,
    outcomeData: [
      { name: "Recuperado", value: total - obitos },
      { name: "Óbito", value: obitos },
    ],
  };
}
