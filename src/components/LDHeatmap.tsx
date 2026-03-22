import { useMemo } from "react";
import type { LDMatrix } from "@/lib/ldAnalysis";

interface LDHeatmapProps {
  matrix: LDMatrix;
  title: string;
  colorScheme?: "r2" | "dprime";
}

function getColor(value: number, scheme: "r2" | "dprime"): string {
  if (Number.isNaN(value)) return "hsl(var(--muted))";
  const clamped = Math.max(0, Math.min(1, Math.abs(value)));

  if (scheme === "r2") {
    // White → Blue
    const r = Math.round(255 * (1 - clamped));
    const g = Math.round(255 * (1 - clamped));
    const b = 255;
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // White → Red
    const r = 255;
    const g = Math.round(255 * (1 - clamped));
    const b = Math.round(255 * (1 - clamped));
    return `rgb(${r}, ${g}, ${b})`;
  }
}

export default function LDHeatmap({ matrix, title, colorScheme = "r2" }: LDHeatmapProps) {
  const { loci, values } = matrix;
  const n = loci.length;

  const cellSize = useMemo(() => {
    if (n <= 5) return 64;
    if (n <= 10) return 48;
    if (n <= 20) return 36;
    return 28;
  }, [n]);

  const labelWidth = useMemo(() => {
    const maxLen = Math.max(...loci.map(l => l.length));
    return Math.max(60, maxLen * 8);
  }, [loci]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="overflow-auto">
        <div style={{ display: "inline-block" }}>
          {/* Header row */}
          <div className="flex">
            <div style={{ width: labelWidth, minWidth: labelWidth }} />
            {loci.map(l => (
              <div
                key={l}
                style={{ width: cellSize, minWidth: cellSize }}
                className="text-[10px] font-mono text-muted-foreground text-center truncate px-0.5"
                title={l}
              >
                {l}
              </div>
            ))}
          </div>

          {/* Matrix rows */}
          {loci.map((rowLocus, i) => (
            <div key={rowLocus} className="flex">
              <div
                style={{ width: labelWidth, minWidth: labelWidth, height: cellSize }}
                className="text-[10px] font-mono text-muted-foreground flex items-center justify-end pr-2 truncate"
                title={rowLocus}
              >
                {rowLocus}
              </div>
              {loci.map((_, j) => {
                const val = values[i][j];
                const displayVal = Number.isNaN(val) ? "NA" : val.toFixed(3);
                const bg = getColor(val, colorScheme);
                const textColor = (Math.abs(val) > 0.5 && !Number.isNaN(val)) ? "white" : "hsl(var(--foreground))";

                return (
                  <div
                    key={j}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      minWidth: cellSize,
                      backgroundColor: bg,
                      color: textColor,
                    }}
                    className="flex items-center justify-center text-[9px] font-mono border border-background/50"
                    title={`${rowLocus} × ${loci[j]}: ${displayVal}`}
                  >
                    {displayVal}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
            <span>0</span>
            <div
              className="h-3 rounded"
              style={{
                width: 120,
                background: colorScheme === "r2"
                  ? "linear-gradient(to right, white, rgb(0,0,255))"
                  : "linear-gradient(to right, white, rgb(255,0,0))",
              }}
            />
            <span>1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
