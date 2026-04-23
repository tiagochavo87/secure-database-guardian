/**
 * Linkage Disequilibrium (LD) Analysis Engine
 * Port of ld_mloc_colab.ipynb Python notebook to TypeScript
 * Implements EM algorithm for multilocus haplotype frequency estimation
 * and pairwise LD calculations (D, D', r²)
 */

// --- Types ---

export interface LDParams {
  maxIter: number;
  tol: number;
  minHapFreqToReport: number;
  missingCode: number;
}

export const DEFAULT_LD_PARAMS: LDParams = {
  maxIter: 2000,
  tol: 1e-10,
  minHapFreqToReport: 1e-8,
  missingCode: -9,
};

export interface LocusPair {
  name: string;
  col1: string;
  col2: string;
}

export interface QCRow {
  locus: string;
  nNonMissing: number;
  nMissing: number;
  nPartialMissing: number;
  alleleCounts: Record<number, number>;
  alleleFreqs: Record<number, number>;
  maf: number;
}

export interface HaplotypeRow {
  haplotype: string;
  frequency: number;
  directlyObservable: boolean;
}

export interface PairwiseLDDetail {
  locus1: string;
  locus2: string;
  allele1: number;
  allele2: number;
  pA: number;
  pB: number;
  pAB: number;
  D: number;
  dPrime: number;
  r2: number;
}

export interface LDMatrix {
  loci: string[];
  values: number[][];
}

export interface LDResults {
  qc: QCRow[];
  haplotypes: HaplotypeRow[];
  ldDetails: PairwiseLDDetail[];
  r2Matrix: LDMatrix;
  dPrimeMatrix: LDMatrix;
  summary: {
    nSamples: number;
    nLoci: number;
    nPossibleHaplotypes: number;
    emIterations: number;
    logLikelihood: number;
    nUnresolvable: number;
  };
  missingLociDistribution: Record<number, number>;
}

// --- Utility functions ---

function isMissingAllele(x: unknown, missingCode: number): boolean {
  return x === null || x === undefined || x === "" || Number.isNaN(Number(x)) || Number(x) === missingCode;
}

// --- File parsing ---

export function parseMLOCUSFile(text: string): { headers: string[]; rows: (string | number | null)[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length < 1) throw new Error("Arquivo vazio.");

  // Try tab first, then auto-detect
  let sep = "\t";
  const firstLineTabs = (lines[0].match(/\t/g) || []).length;
  if (firstLineTabs < 2) {
    // try comma or multiple spaces
    const firstLineCommas = (lines[0].match(/,/g) || []).length;
    if (firstLineCommas > firstLineTabs) sep = ",";
    else sep = /\s+/.source as never; // whitespace
  }

  const splitLine = (line: string): string[] => {
    if (sep === "\t" || sep === ",") return line.split(sep);
    return line.split(/\s+/);
  };

  const headers = splitLine(lines[0]).map(h => h.trim());
  const rows: (string | number | null)[][] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = splitLine(lines[i]);
    const row: (string | number | null)[] = [];
    for (let j = 0; j < headers.length; j++) {
      const val = parts[j]?.trim() ?? "";
      if (val === "" || val === "NA" || val === "NaN" || val === "." || val === "NULL" || val === "null") {
        row.push(null);
      } else {
        const num = Number(val);
        row.push(Number.isNaN(num) ? val : num);
      }
    }
    rows.push(row);
  }

  if (headers.length < 3) throw new Error("Arquivo inválido: precisa ter ID + pelo menos 1 locus (2 colunas).");
  if ((headers.length - 1) % 2 !== 0) throw new Error("Número de colunas inválido: após a coluna ID, o número deve ser par.");

  return { headers, rows };
}

// --- Detect locus pairs ---

export function detectLocusPairs(genoCols: string[]): LocusPair[] {
  const pairs: LocusPair[] = [];
  const suffixes = ["A", "B", "_1", "_2", "-1", "-2", ".1", ".2"];

  for (let i = 0; i < genoCols.length; i += 2) {
    const c1 = genoCols[i];
    const c2 = genoCols[i + 1];
    let base = c1;
    for (const suffix of suffixes) {
      if (base.endsWith(suffix)) {
        base = base.slice(0, -suffix.length);
        break;
      }
    }
    pairs.push({ name: base, col1: c1, col2: c2 });
  }
  return pairs;
}

// --- QC ---

function computeQC(
  rows: (string | number | null)[][],
  locusPairs: LocusPair[],
  headers: string[],
  missingCode: number
): { qc: QCRow[]; missingDist: Record<number, number> } {
  const qc: QCRow[] = [];
  const missingPerSample: number[] = [];

  for (const lp of locusPairs) {
    const col1Idx = headers.indexOf(lp.col1);
    const col2Idx = headers.indexOf(lp.col2);
    let nMissing = 0, nPartial = 0, nValid = 0;
    const alleles: number[] = [];

    for (const row of rows) {
      const a = row[col1Idx];
      const b = row[col2Idx];
      const aMiss = isMissingAllele(a, missingCode);
      const bMiss = isMissingAllele(b, missingCode);

      if (aMiss && bMiss) { nMissing++; continue; }
      if (aMiss !== bMiss) { nPartial++; continue; }
      nValid++;
      alleles.push(Number(a), Number(b));
    }

    const counts: Record<number, number> = {};
    alleles.forEach(a => { counts[a] = (counts[a] || 0) + 1; });

    const total = alleles.length;
    const freqs: Record<number, number> = {};
    Object.entries(counts).forEach(([k, v]) => { freqs[Number(k)] = v / total; });

    const freqVals = Object.values(freqs);
    const maf = freqVals.length > 1 ? Math.min(...freqVals) : (freqVals.length === 1 ? 0 : NaN);

    qc.push({ locus: lp.name, nNonMissing: nValid, nMissing, nPartialMissing: nPartial, alleleCounts: counts, alleleFreqs: freqs, maf });
  }

  // Missing loci per sample
  for (const row of rows) {
    let count = 0;
    for (const lp of locusPairs) {
      const a = row[headers.indexOf(lp.col1)];
      const b = row[headers.indexOf(lp.col2)];
      const aMiss = isMissingAllele(a, missingCode);
      const bMiss = isMissingAllele(b, missingCode);
      if (aMiss || bMiss) count++;
    }
    missingPerSample.push(count);
  }

  const missingDist: Record<number, number> = {};
  missingPerSample.forEach(n => { missingDist[n] = (missingDist[n] || 0) + 1; });

  return { qc, missingDist };
}

// --- Build genotypes and allele sets ---

type Genotype = [number, number][];

function buildGenotypeList(
  rows: (string | number | null)[][],
  headers: string[],
  locusPairs: LocusPair[],
  missingCode: number
): { genotypes: Genotype[]; alleleSets: number[][] } {
  const alleleSets: number[][] = [];

  for (const lp of locusPairs) {
    const col1Idx = headers.indexOf(lp.col1);
    const col2Idx = headers.indexOf(lp.col2);
    const alleleSet = new Set<number>();
    for (const row of rows) {
      for (const idx of [col1Idx, col2Idx]) {
        const v = row[idx];
        if (!isMissingAllele(v, missingCode)) alleleSet.add(Number(v));
      }
    }
    const sorted = Array.from(alleleSet).sort((a, b) => a - b);
    if (sorted.length === 0) throw new Error(`Locus ${lp.name} sem alelos válidos.`);
    alleleSets.push(sorted);
  }

  const genotypes: Genotype[] = [];
  for (const row of rows) {
    const geno: Genotype = [];
    for (const lp of locusPairs) {
      const a = row[headers.indexOf(lp.col1)];
      const b = row[headers.indexOf(lp.col2)];
      const aMiss = isMissingAllele(a, missingCode);
      const bMiss = isMissingAllele(b, missingCode);
      if (aMiss || bMiss) {
        geno.push([missingCode, missingCode]);
      } else {
        geno.push([Number(a), Number(b)]);
      }
    }
    genotypes.push(geno);
  }

  return { genotypes, alleleSets };
}

// --- Cartesian product ---

function cartesianProduct(arrays: number[][]): number[][] {
  if (arrays.length === 0) return [[]];
  return arrays.reduce<number[][]>(
    (acc, arr) => acc.flatMap(combo => arr.map(el => [...combo, el])),
    [[]]
  );
}

// --- Compatible haplotype pairs ---

function genotypeMatchesPair(h1: number[], h2: number[], geno: Genotype, missingCode: number): boolean {
  for (let i = 0; i < geno.length; i++) {
    const [a, b] = geno[i];
    if (a === missingCode && b === missingCode) continue;
    const expected = [a, b].sort((x, y) => x - y);
    const observed = [h1[i], h2[i]].sort((x, y) => x - y);
    if (expected[0] !== observed[0] || expected[1] !== observed[1]) return false;
  }
  return true;
}

function findCompatiblePairs(geno: Genotype, haplotypes: number[][], missingCode: number): [number, number][] {
  const pairs: [number, number][] = [];
  for (let i = 0; i < haplotypes.length; i++) {
    for (let j = i; j < haplotypes.length; j++) {
      if (genotypeMatchesPair(haplotypes[i], haplotypes[j], geno, missingCode)) {
        pairs.push([i, j]);
      }
    }
  }
  return pairs;
}

// --- EM algorithm ---

function runEM(
  compatiblePairs: [number, number][][],
  nHaps: number,
  maxIter: number,
  tol: number
): { freqs: number[]; logLik: number; iterations: number } {
  let freqs = new Float64Array(nHaps).fill(1 / nHaps);
  let logLikPrev: number | null = null;

  for (let iter = 1; iter <= maxIter; iter++) {
    const expectedCounts = new Float64Array(nHaps);
    let logLik = 0;

    for (const pairs of compatiblePairs) {
      if (pairs.length === 0) continue;

      const pairProbs: number[] = [];
      for (const [i, j] of pairs) {
        let p = freqs[i] * freqs[j];
        if (i !== j) p *= 2;
        pairProbs.push(p);
      }

      let denom = 0;
      for (const p of pairProbs) denom += p;
      if (denom <= 0) {
        const uniform = 1 / pairs.length;
        pairProbs.fill(uniform);
        denom = 1;
      }

      logLik += Math.log(denom);

      for (let k = 0; k < pairs.length; k++) {
        const [i, j] = pairs[k];
        const w = pairProbs[k] / denom;
        if (i === j) {
          expectedCounts[i] += 2 * w;
        } else {
          expectedCounts[i] += w;
          expectedCounts[j] += w;
        }
      }
    }

    let total = 0;
    for (let i = 0; i < nHaps; i++) total += expectedCounts[i];
    if (total === 0) throw new Error("EM falhou: contagens esperadas zeradas.");

    const newFreqs = new Float64Array(nHaps);
    for (let i = 0; i < nHaps; i++) newFreqs[i] = expectedCounts[i] / total;

    if (logLikPrev !== null && Math.abs(logLik - logLikPrev) < tol) {
      return { freqs: Array.from(newFreqs), logLik, iterations: iter };
    }

    freqs = newFreqs;
    logLikPrev = logLik;
  }

  return { freqs: Array.from(freqs), logLik: logLikPrev ?? 0, iterations: maxIter };
}

// --- Directly observable haplotypes ---

function directlyObservableHaplotypes(genotypes: Genotype[], missingCode: number): Set<string> {
  const observed = new Set<string>();

  for (const geno of genotypes) {
    const typed = geno.filter(([a, b]) => !(a === missingCode && b === missingCode));
    if (typed.length === 0) continue;

    const hetCount = typed.filter(([a, b]) => a !== b).length;

    if (hetCount === 0) {
      const hap = geno.map(([a, b]) => (a === missingCode && b === missingCode) ? null : a);
      if (hap.every(v => v !== null)) observed.add(hap.join("|"));
    } else if (hetCount === 1) {
      const hap1: (number | null)[] = [];
      const hap2: (number | null)[] = [];
      for (const [a, b] of geno) {
        if (a === missingCode && b === missingCode) { hap1.push(null); hap2.push(null); }
        else if (a === b) { hap1.push(a); hap2.push(a); }
        else { hap1.push(a); hap2.push(b); }
      }
      if (hap1.every(v => v !== null)) observed.add(hap1.join("|"));
      if (hap2.every(v => v !== null)) observed.add(hap2.join("|"));
    }
  }

  return observed;
}

// --- Pairwise LD ---

function computePairwiseLD(
  loci: string[],
  haplotypes: number[][],
  freqs: number[]
): { details: PairwiseLDDetail[]; r2Matrix: LDMatrix; dPrimeMatrix: LDMatrix } {
  const n = loci.length;
  const r2Vals = Array.from({ length: n }, () => new Array(n).fill(NaN));
  const dpVals = Array.from({ length: n }, () => new Array(n).fill(NaN));
  const details: PairwiseLDDetail[] = [];

  for (let i = 0; i < n; i++) { r2Vals[i][i] = 1; dpVals[i][i] = 1; }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const allelesI = Array.from(new Set(haplotypes.map(h => h[i]))).sort((a, b) => a - b);
      const allelesJ = Array.from(new Set(haplotypes.map(h => h[j]))).sort((a, b) => a - b);

      const pA: Record<number, number> = {};
      const pB: Record<number, number> = {};
      const pAB: Record<string, number> = {};

      for (let k = 0; k < haplotypes.length; k++) {
        const a = haplotypes[k][i];
        const b = haplotypes[k][j];
        const f = freqs[k];
        pA[a] = (pA[a] || 0) + f;
        pB[b] = (pB[b] || 0) + f;
        pAB[`${a},${b}`] = (pAB[`${a},${b}`] || 0) + f;
      }

      const refA = allelesI[0];
      const refB = allelesJ[0];
      let globalR2 = NaN;
      let globalDprime = NaN;

      for (const a of allelesI) {
        for (const b of allelesJ) {
          const pab = pAB[`${a},${b}`] || 0;
          const pa = pA[a] || 0;
          const pb = pB[b] || 0;

          const D = pab - pa * pb;
          const denom = pa * (1 - pa) * pb * (1 - pb);
          const r2 = denom > 0 ? (D * D) / denom : NaN;

          let Dmax: number;
          if (D >= 0) {
            Dmax = Math.min(pa * (1 - pb), (1 - pa) * pb);
          } else {
            Dmax = Math.min(pa * pb, (1 - pa) * (1 - pb));
          }
          const dPrime = Dmax > 0 ? D / Dmax : NaN;

          details.push({
            locus1: loci[i], locus2: loci[j],
            allele1: a, allele2: b,
            pA: pa, pB: pb, pAB: pab,
            D, dPrime, r2
          });

          if (a === refA && b === refB) {
            globalR2 = r2;
            globalDprime = dPrime;
          }
        }
      }

      r2Vals[i][j] = globalR2; r2Vals[j][i] = globalR2;
      dpVals[i][j] = globalDprime; dpVals[j][i] = globalDprime;
    }
  }

  return {
    details,
    r2Matrix: { loci, values: r2Vals },
    dPrimeMatrix: { loci, values: dpVals },
  };
}

// --- Main analysis function ---

export function runLDAnalysis(
  text: string,
  params: LDParams = DEFAULT_LD_PARAMS,
  onProgress?: (msg: string) => void
): LDResults {
  const log = (msg: string) => onProgress?.(msg);

  log("Lendo arquivo...");
  const { headers, rows } = parseMLOCUSFile(text);

  const genoCols = headers.slice(1);
  const locusPairs = detectLocusPairs(genoCols);
  const loci = locusPairs.map(lp => lp.name);

  log(`Detectados ${loci.length} loci e ${rows.length} amostras`);

  log("Executando controle de qualidade...");
  const { qc, missingDist } = computeQC(rows, locusPairs, headers, params.missingCode);

  log("Construindo genótipos...");
  const { genotypes, alleleSets } = buildGenotypeList(rows, headers, locusPairs, params.missingCode);

  log("Gerando haplótipos possíveis...");
  const allHaplotypes = cartesianProduct(alleleSets);
  const nHaps = allHaplotypes.length;
  log(`${nHaps} haplótipos possíveis`);

  if (nHaps > 10000) {
    throw new Error(`Número muito grande de haplótipos possíveis (${nHaps}). Reduza o número de loci.`);
  }

  log("Calculando pares compatíveis...");
  const compatiblePairs: [number, number][][] = [];
  let nUnresolvable = 0;
  for (const geno of genotypes) {
    const pairs = findCompatiblePairs(geno, allHaplotypes, params.missingCode);
    if (pairs.length === 0) nUnresolvable++;
    compatiblePairs.push(pairs);
  }

  log(`Executando EM (max ${params.maxIter} iterações)...`);
  const { freqs, logLik, iterations } = runEM(compatiblePairs, nHaps, params.maxIter, params.tol);
  log(`EM concluído em ${iterations} iterações`);

  // Directly observable
  const directObs = directlyObservableHaplotypes(genotypes, params.missingCode);

  // Haplotype table
  const haplotypes: HaplotypeRow[] = [];
  for (let i = 0; i < allHaplotypes.length; i++) {
    if (freqs[i] >= params.minHapFreqToReport) {
      const hapStr = allHaplotypes[i].join("|");
      haplotypes.push({
        haplotype: hapStr,
        frequency: freqs[i],
        directlyObservable: directObs.has(hapStr),
      });
    }
  }
  haplotypes.sort((a, b) => b.frequency - a.frequency);

  log("Calculando LD pairwise...");
  const { details, r2Matrix, dPrimeMatrix } = computePairwiseLD(loci, allHaplotypes, freqs);

  log("Análise concluída!");

  return {
    qc,
    haplotypes,
    ldDetails: details,
    r2Matrix,
    dPrimeMatrix,
    summary: {
      nSamples: rows.length,
      nLoci: loci.length,
      nPossibleHaplotypes: nHaps,
      emIterations: iterations,
      logLikelihood: logLik,
      nUnresolvable,
    },
    missingLociDistribution: missingDist,
  };
}
