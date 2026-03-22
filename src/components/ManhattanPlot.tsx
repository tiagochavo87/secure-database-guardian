import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { PairwiseLDDetail } from "@/lib/ldAnalysis";

interface ManhattanPlotProps {
  ldDetails: PairwiseLDDetail[];
  nSamples: number;
}

/** Compute -log10(p) from r² using χ² = n × r² with 1 df */
function chiSqPValue(r2: number, n: number): number {
  if (Number.isNaN(r2) || r2 <= 0 || n <= 0) return 1;
  const chi2 = n * r2;
  // Approximation of upper-tail chi-square CDF with 1 df
  // P(χ²₁ > x) ≈ erfc(√(x/2))
  const z = Math.sqrt(chi2 / 2);
  return erfc(z);
}

function erfc(x: number): number {
  // Abramowitz & Stegun approximation 7.1.26
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const poly =
    t *
    (0.254829592 +
      t *
        (-0.284496736 +
          t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const result = poly * Math.exp(-x * x);
  return x >= 0 ? result : 2 - result;
}

const PAIR_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 50%)",
  "hsl(150, 60%, 40%)",
  "hsl(30, 80%, 50%)",
  "hsl(280, 60%, 50%)",
  "hsl(0, 70%, 50%)",
  "hsl(180, 60%, 40%)",
];

export default function ManhattanPlot({ ldDetails, nSamples }: ManhattanPlotProps) {
  const data = useMemo(() => {
    // Deduplicate: take the max r² per locus pair (across allele combos)
    const pairMap = new Map<string, { r2: number; locus1: string; locus2: string }>();

    for (const d of ldDetails) {
      const key = `${d.locus1}|${d.locus2}`;
      const existing = pairMap.get(key);
      if (!existing || d.r2 > existing.r2) {
        pairMap.set(key, { r2: d.r2, locus1: d.locus1, locus2: d.locus2 });
      }
    }

    // Assign x index and compute -log10(p)
    const lociSet = new Set<string>();
    for (const v of pairMap.values()) {
      lociSet.add(v.locus1);
      lociSet.add(v.locus2);
    }
    const lociOrder = Array.from(lociSet);

    return Array.from(pairMap.values()).map((v, idx) => {
      const pval = chiSqPValue(v.r2, nSamples);
      const negLog10P = pval > 0 ? -Math.log10(pval) : 0;
      const locus1Idx = lociOrder.indexOf(v.locus1);
      return {
        x: idx,
        y: negLog10P,
        pairLabel: `${v.locus1} × ${v.locus2}`,
        r2: v.r2,
        pValue: pval,
        colorIdx: locus1Idx % PAIR_COLORS.length,
      };
    });
  }, [ldDetails, nSamples]);

  const maxY = Math.max(5, ...data.map((d) => d.y)) * 1.1;

  // Significance thresholds
  const suggestive = -Math.log10(1e-3); // 3
  const significant = -Math.log10(5e-5); // ~4.3

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Manhattan Plot (LD)</h3>
      <p className="text-[10px] text-muted-foreground">
        -log₁₀(p-value) por par de loci. p-value derivado de χ² = n × r² (1 g.l.)
      </p>
      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 40, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis
              dataKey="x"
              type="number"
              tick={{ fontSize: 10 }}
              label={{ value: "Par de loci (índice)", position: "bottom", fontSize: 11, offset: 20 }}
              className="fill-muted-foreground"
            />
            <YAxis
              dataKey="y"
              type="number"
              domain={[0, maxY]}
              tick={{ fontSize: 10 }}
              label={{ value: "-log₁₀(p)", angle: -90, position: "insideLeft", fontSize: 11 }}
              className="fill-muted-foreground"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
                    <p className="font-semibold">{d.pairLabel}</p>
                    <p>r² = {d.r2.toFixed(4)}</p>
                    <p>p-value = {d.pValue.toExponential(3)}</p>
                    <p>-log₁₀(p) = {d.y.toFixed(3)}</p>
                  </div>
                );
              }}
            />
            <ReferenceLine y={suggestive} stroke="hsl(var(--muted-foreground))" strokeDasharray="6 3" />
            <ReferenceLine y={significant} stroke="hsl(var(--destructive))" strokeDasharray="6 3" />
            {/* Group by color */}
            {Array.from(new Set(data.map((d) => d.colorIdx))).map((ci) => (
              <Scatter
                key={ci}
                data={data.filter((d) => d.colorIdx === ci)}
                fill={PAIR_COLORS[ci]}
                r={5}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 border-t-2 border-dashed border-muted-foreground" /> Sugestivo (p &lt; 10⁻³)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 border-t-2 border-dashed border-destructive" /> Significativo (p &lt; 5×10⁻⁵)
        </span>
      </div>
    </div>
  );
}
