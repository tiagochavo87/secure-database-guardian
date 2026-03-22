import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface Props {
  data: Record<string, unknown>[];
  variables: { name: string; variable_type: string; category: string }[];
  visibleVars: Set<string>;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 60%, 55%)",
  "hsl(340, 55%, 50%)",
  "hsl(160, 50%, 45%)",
  "hsl(40, 70%, 50%)",
  "hsl(280, 45%, 55%)",
  "hsl(20, 65%, 50%)",
];

export default function DashboardCharts({ data, variables, visibleVars }: Props) {
  const analysis = useMemo(() => {
    if (data.length === 0) return { numeric: [], categorical: [], summary: [] };

    const visible = variables.filter((v) => visibleVars.has(v.name));
    const numericVars: { name: string; values: number[] }[] = [];
    const categoricalVars: { name: string; counts: Record<string, number> }[] = [];

    for (const v of visible.slice(0, 20)) {
      const rawValues = data.map((row) => row[v.name]).filter((val) => val != null && val !== "");

      if (rawValues.length === 0) continue;

      const numericValues = rawValues
        .map((val) => Number(val))
        .filter((n) => Number.isFinite(n));

      const isNumeric =
        v.variable_type === "number" ||
        v.variable_type === "integer" ||
        numericValues.length > rawValues.length * 0.7;

      if (isNumeric && numericValues.length >= 3) {
        numericVars.push({ name: v.name, values: numericValues });
      } else {
        const counts: Record<string, number> = {};
        for (const val of rawValues) {
          const key = String(val);
          counts[key] = (counts[key] || 0) + 1;
        }
        const uniqueKeys = Object.keys(counts);
        if (uniqueKeys.length >= 2 && uniqueKeys.length <= 15) {
          categoricalVars.push({ name: v.name, counts });
        }
      }
    }

    // Summary stats for numeric vars
    const summary = numericVars.slice(0, 8).map(({ name, values }) => {
      const sorted = [...values].sort((a, b) => a - b);
      const sum = values.reduce((s, v) => s + v, 0);
      const mean = sum / values.length;
      const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
      const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
      const std = Math.sqrt(variance);

      return {
        name,
        n: values.length,
        mean: Number(mean.toFixed(2)),
        median: Number(median.toFixed(2)),
        std: Number(std.toFixed(2)),
        min: sorted[0],
        max: sorted[sorted.length - 1],
      };
    });

    return {
      numeric: numericVars.slice(0, 4),
      categorical: categoricalVars.slice(0, 4),
      summary,
    };
  }, [data, variables, visibleVars]);

  if (data.length === 0) return null;
  if (analysis.numeric.length === 0 && analysis.categorical.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold font-display">Análise dos Dados</h3>

      {/* Summary stats table */}
      {analysis.summary.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estatísticas Descritivas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Variável</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">N</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Média</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Mediana</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">DP</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Min</th>
                    <th className="text-right py-2 pl-2 font-medium text-muted-foreground">Max</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.summary.map((s) => (
                    <tr key={s.name} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono">{s.name}</td>
                      <td className="text-right py-2 px-2">{s.n}</td>
                      <td className="text-right py-2 px-2">{s.mean}</td>
                      <td className="text-right py-2 px-2">{s.median}</td>
                      <td className="text-right py-2 px-2">{s.std}</td>
                      <td className="text-right py-2 px-2">{s.min}</td>
                      <td className="text-right py-2 pl-2">{s.max}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Numeric distribution histograms */}
        {analysis.numeric.map(({ name, values }) => {
          const binCount = Math.min(12, Math.max(5, Math.ceil(Math.sqrt(values.length))));
          const min = Math.min(...values);
          const max = Math.max(...values);
          const binWidth = (max - min) / binCount || 1;

          const bins = Array.from({ length: binCount }, (_, i) => ({
            label: `${(min + i * binWidth).toFixed(1)}`,
            count: 0,
          }));

          for (const val of values) {
            const idx = Math.min(Math.floor((val - min) / binWidth), binCount - 1);
            bins[idx].count++;
          }

          return (
            <Card key={name}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium font-mono">{name}</CardTitle>
                  <Badge variant="outline" className="text-xs">Numérica</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={bins} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Frequência" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          );
        })}

        {/* Categorical distribution pie/bar */}
        {analysis.categorical.map(({ name, counts }) => {
          const entries = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([label, value]) => ({ label, value }));

          const usePie = entries.length <= 6;

          return (
            <Card key={name}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium font-mono">{name}</CardTitle>
                  <Badge variant="outline" className="text-xs">Categórica</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  {usePie ? (
                    <PieChart>
                      <Pie
                        data={entries}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        label={({ label, percent }) => `${label} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                        fontSize={10}
                      >
                        {entries.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  ) : (
                    <BarChart data={entries} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={55} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} name="Frequência" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
