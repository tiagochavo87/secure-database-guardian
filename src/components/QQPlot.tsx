import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";
import type { PairwiseLDDetail } from "@/lib/ldAnalysis";

interface QQPlotProps {
  ldDetails: PairwiseLDDetail[];
  nSamples: number;
}

/** Compute p-value from r² using χ² = n × r² with 1 df */
function chiSqPValue(r2: number, n: number): number {
  if (Number.isNaN(r2) || r2 <= 0 || n <= 0) return 1;
  const chi2 = n * r2;
  const z = Math.sqrt(chi2 / 2);
  return erfc(z);
}

function erfc(x: number): number {
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

export default function QQPlot({ ldDetails, nSamples }: QQPlotProps) {
  const { observed, diagonal } = useMemo(() => {
    // Deduplicate: max r² per locus pair
    const pairMap = new Map<string, number>();
    for (const d of ldDetails) {
      const key = `${d.locus1}|${d.locus2}`;
      const existing = pairMap.get(key);
      if (!existing || d.r2 > existing) pairMap.set(key, d.r2);
    }

    const pValues = Array.from(pairMap.values())
      .map((r2) => chiSqPValue(r2, nSamples))
      .sort((a, b) => a - b);

    const n = pValues.length;
    const points = pValues.map((p, i) => {
      const expected = (i + 0.5) / n;
      return {
        expected: -Math.log10(expected),
        observed: p > 0 ? -Math.log10(p) : 0,
        pValue: p,
        rank: i + 1,
      };
    });

    const maxVal = Math.max(
      ...points.map((p) => Math.max(p.expected, p.observed)),
      1
    );
    const diag = [
      { expected: 0, observed: 0 },
      { expected: maxVal * 1.05, observed: maxVal * 1.05 },
    ];

    return { observed: points, diagonal: diag };
  }, [ldDetails, nSamples]);

  const maxAxis = Math.max(
    ...observed.map((p) => Math.max(p.expected, p.observed)),
    1
  ) * 1.1;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">QQ-Plot</h3>
      <p className="text-[10px] text-muted-foreground">
        -log₁₀(p esperado) vs -log₁₀(p observado). Desvio da diagonal indica LD significativo.
      </p>
      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 10, right: 20, bottom: 40, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis
              dataKey="expected"
              type="number"
              domain={[0, maxAxis]}
              tick={{ fontSize: 10 }}
              label={{
                value: "-log₁₀(p esperado)",
                position: "bottom",
                fontSize: 11,
                offset: 20,
              }}
              className="fill-muted-foreground"
            />
            <YAxis
              dataKey="observed"
              type="number"
              domain={[0, maxAxis]}
              tick={{ fontSize: 10 }}
              label={{
                value: "-log₁₀(p observado)",
                angle: -90,
                position: "insideLeft",
                fontSize: 11,
              }}
              className="fill-muted-foreground"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload;
                if (d.rank === undefined) return null;
                return (
                  <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
                    <p>Rank: {d.rank}</p>
                    <p>p observado: {d.pValue?.toExponential(3)}</p>
                    <p>-log₁₀(p obs): {d.observed?.toFixed(3)}</p>
                    <p>-log₁₀(p esp): {d.expected?.toFixed(3)}</p>
                  </div>
                );
              }}
            />
            {/* Diagonal reference line */}
            <Line
              data={diagonal}
              dataKey="observed"
              type="linear"
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="6 3"
              dot={false}
              legendType="none"
              isAnimationActive={false}
            />
            <Scatter
              data={observed}
              fill="hsl(var(--primary))"
              r={4}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-primary" /> Observado
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 border-t-2 border-dashed border-muted-foreground" /> Esperado (H₀)
        </span>
      </div>
    </div>
  );
}
