import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter, LineChart, Line,
} from "recharts";

interface Variable {
  name: string;
  variable_type: string;
  category: string;
}

interface Props {
  data: Record<string, unknown>[];
  variables: Variable[];
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

function computeNumericStats(values: number[]) {
  const n = values.length;
  if (n === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((s, v) => s + v, 0);
  const mean = sum / n;
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);

  // Quartiles
  const q1Idx = Math.floor(n * 0.25);
  const q3Idx = Math.floor(n * 0.75);
  const q1 = sorted[q1Idx];
  const q3 = sorted[q3Idx];
  const iqr = q3 - q1;

  // Skewness & Kurtosis
  const skewness = std > 0
    ? values.reduce((s, v) => s + ((v - mean) / std) ** 3, 0) / n
    : 0;
  const kurtosis = std > 0
    ? values.reduce((s, v) => s + ((v - mean) / std) ** 4, 0) / n - 3
    : 0;

  // Coefficient of variation
  const cv = mean !== 0 ? (std / Math.abs(mean)) * 100 : 0;

  // Missing count is computed externally
  return {
    n,
    mean: Number(mean.toFixed(4)),
    median: Number(median.toFixed(4)),
    std: Number(std.toFixed(4)),
    variance: Number(variance.toFixed(4)),
    min: sorted[0],
    max: sorted[n - 1],
    range: Number((sorted[n - 1] - sorted[0]).toFixed(4)),
    q1: Number(q1.toFixed(4)),
    q3: Number(q3.toFixed(4)),
    iqr: Number(iqr.toFixed(4)),
    skewness: Number(skewness.toFixed(4)),
    kurtosis: Number(kurtosis.toFixed(4)),
    cv: Number(cv.toFixed(2)),
  };
}

export default function DescriptiveStats({ data, variables, visibleVars }: Props) {
  const analysis = useMemo(() => {
    if (data.length === 0) return { numeric: [], categorical: [] };

    const visible = variables.filter((v) => visibleVars.has(v.name));
    const numericResults: {
      name: string;
      category: string;
      stats: ReturnType<typeof computeNumericStats>;
      missing: number;
      total: number;
      values: number[];
    }[] = [];
    const categoricalResults: {
      name: string;
      category: string;
      counts: { label: string; value: number; pct: number }[];
      missing: number;
      total: number;
      unique: number;
      mode: string;
    }[] = [];

    for (const v of visible) {
      const rawValues = data.map((row) => row[v.name]);
      const nonNull = rawValues.filter((val) => val != null && val !== "" && val !== "NA" && val !== "N/A");
      const missing = rawValues.length - nonNull.length;

      const numericValues = nonNull.map((val) => Number(val)).filter((n) => Number.isFinite(n));
      const isNumeric =
        v.variable_type === "number" ||
        v.variable_type === "integer" ||
        (numericValues.length > nonNull.length * 0.7 && numericValues.length >= 3);

      if (isNumeric && numericValues.length >= 3) {
        numericResults.push({
          name: v.name,
          category: v.category,
          stats: computeNumericStats(numericValues),
          missing,
          total: rawValues.length,
          values: numericValues,
        });
      } else if (nonNull.length > 0) {
        const countMap: Record<string, number> = {};
        for (const val of nonNull) {
          const key = String(val);
          countMap[key] = (countMap[key] || 0) + 1;
        }
        const entries = Object.entries(countMap)
          .sort((a, b) => b[1] - a[1])
          .map(([label, value]) => ({ label, value, pct: Number(((value / nonNull.length) * 100).toFixed(1)) }));

        categoricalResults.push({
          name: v.name,
          category: v.category,
          counts: entries,
          missing,
          total: rawValues.length,
          unique: entries.length,
          mode: entries[0]?.label || "",
        });
      }
    }

    return { numeric: numericResults, categorical: categoricalResults };
  }, [data, variables, visibleVars]);

  if (data.length === 0) return null;
  if (analysis.numeric.length === 0 && analysis.categorical.length === 0) return null;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">Resumo Geral</TabsTrigger>
          <TabsTrigger value="numeric">Numéricas ({analysis.numeric.length})</TabsTrigger>
          <TabsTrigger value="categorical">Categóricas ({analysis.categorical.length})</TabsTrigger>
          <TabsTrigger value="charts">Gráficos</TabsTrigger>
        </TabsList>

        {/* Summary Table */}
        <TabsContent value="summary">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Estatísticas Descritivas — Resumo</CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.numeric.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Variáveis Numéricas</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          {["Variável", "N", "Missing", "Média", "Mediana", "DP", "Min", "Q1", "Q3", "Max", "Assimetria", "Curtose", "CV%"].map((h) => (
                            <th key={h} className="text-right py-2 px-2 font-medium text-muted-foreground first:text-left">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.numeric.map((v) => (
                          <tr key={v.name} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="py-2 px-2 font-mono text-left">
                              {v.name}
                              <Badge variant="outline" className="ml-2 text-[10px]">{v.category}</Badge>
                            </td>
                            <td className="text-right py-2 px-2">{v.stats?.n}</td>
                            <td className="text-right py-2 px-2">{v.missing}</td>
                            <td className="text-right py-2 px-2">{v.stats?.mean}</td>
                            <td className="text-right py-2 px-2">{v.stats?.median}</td>
                            <td className="text-right py-2 px-2">{v.stats?.std}</td>
                            <td className="text-right py-2 px-2">{v.stats?.min}</td>
                            <td className="text-right py-2 px-2">{v.stats?.q1}</td>
                            <td className="text-right py-2 px-2">{v.stats?.q3}</td>
                            <td className="text-right py-2 px-2">{v.stats?.max}</td>
                            <td className="text-right py-2 px-2">{v.stats?.skewness}</td>
                            <td className="text-right py-2 px-2">{v.stats?.kurtosis}</td>
                            <td className="text-right py-2 px-2">{v.stats?.cv}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {analysis.categorical.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Variáveis Categóricas</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          {["Variável", "N Válidos", "Missing", "Categorias", "Moda", "Freq. Moda", "% Moda"].map((h) => (
                            <th key={h} className="text-right py-2 px-2 font-medium text-muted-foreground first:text-left">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.categorical.map((v) => (
                          <tr key={v.name} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="py-2 px-2 font-mono text-left">
                              {v.name}
                              <Badge variant="outline" className="ml-2 text-[10px]">{v.category}</Badge>
                            </td>
                            <td className="text-right py-2 px-2">{v.total - v.missing}</td>
                            <td className="text-right py-2 px-2">{v.missing}</td>
                            <td className="text-right py-2 px-2">{v.unique}</td>
                            <td className="text-right py-2 px-2 font-mono">{v.mode}</td>
                            <td className="text-right py-2 px-2">{v.counts[0]?.value || 0}</td>
                            <td className="text-right py-2 px-2">{v.counts[0]?.pct || 0}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Numeric details */}
        <TabsContent value="numeric">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {analysis.numeric.map((v) => {
              const s = v.stats;
              if (!s) return null;
              const items = [
                ["N", s.n], ["Missing", v.missing], ["Média", s.mean], ["Mediana", s.median],
                ["Desvio Padrão", s.std], ["Variância", s.variance], ["Min", s.min], ["Max", s.max],
                ["Amplitude", s.range], ["Q1", s.q1], ["Q3", s.q3], ["IQR", s.iqr],
                ["Assimetria", s.skewness], ["Curtose", s.kurtosis], ["CV", `${s.cv}%`],
              ];
              return (
                <Card key={v.name}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium font-mono">{v.name}</CardTitle>
                      <Badge variant="outline" className="text-xs">{v.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {items.map(([label, val]) => (
                        <div key={String(label)} className="bg-muted/50 rounded p-2">
                          <div className="text-muted-foreground">{label}</div>
                          <div className="font-semibold font-mono">{val}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Categorical details */}
        <TabsContent value="categorical">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {analysis.categorical.map((v) => (
              <Card key={v.name}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium font-mono">{v.name}</CardTitle>
                    <Badge variant="outline" className="text-xs">{v.unique} categorias</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Valor</th>
                          <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">Freq.</th>
                          <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">%</th>
                          <th className="text-left py-1.5 px-2 font-medium text-muted-foreground w-[40%]">Barra</th>
                        </tr>
                      </thead>
                      <tbody>
                        {v.counts.slice(0, 20).map((c) => (
                          <tr key={c.label} className="border-b last:border-0">
                            <td className="py-1.5 px-2 font-mono">{c.label}</td>
                            <td className="text-right py-1.5 px-2">{c.value}</td>
                            <td className="text-right py-1.5 px-2">{c.pct}%</td>
                            <td className="py-1.5 px-2">
                              <div className="h-3 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${c.pct}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 text-[10px] text-muted-foreground">
                    Missing: {v.missing} · Moda: {v.mode} ({v.counts[0]?.pct}%)
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Charts */}
        <TabsContent value="charts">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {analysis.numeric.slice(0, 6).map(({ name, values }) => {
              const binCount = Math.min(15, Math.max(5, Math.ceil(Math.sqrt(values.length))));
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
                      <Badge variant="outline" className="text-xs">Histograma</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={bins} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Frequência" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              );
            })}

            {analysis.categorical.slice(0, 6).map(({ name, counts }) => {
              const entries = counts.slice(0, 8);
              const usePie = entries.length <= 6;
              return (
                <Card key={name}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium font-mono">{name}</CardTitle>
                      <Badge variant="outline" className="text-xs">{usePie ? "Pizza" : "Barras"}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      {usePie ? (
                        <PieChart>
                          <Pie data={entries} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={75}
                            label={({ label, pct }) => `${label} (${pct}%)`} labelLine={false} fontSize={10}>
                            {entries.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                        </PieChart>
                      ) : (
                        <BarChart data={entries} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                          <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={55} />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                          <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} name="Frequência" />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
