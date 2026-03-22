import { useState, useEffect } from "react";
import { parseUploadedFile } from "@/lib/fileParser";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, FileSpreadsheet } from "lucide-react";

interface FilePreviewProps {
  file: File;
  maxRows?: number;
  onParsed?: (data: Record<string, unknown>[], columns: string[]) => void;
}

export default function FilePreview({ file, maxRows = 20, onParsed }: FilePreviewProps) {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    parseUploadedFile(file)
      .then((rows) => {
        if (cancelled) return;
        if (rows.length === 0) {
          setError("Nenhum dado encontrado no arquivo.");
          setData([]); setColumns([]);
          onParsed?.([], []);
        } else {
          const cols = Object.keys(rows[0]);
          setData(rows); setColumns(cols);
          onParsed?.(rows, cols);
        }
      })
      .catch(() => { if (!cancelled) { setError("Erro ao processar o arquivo."); setData([]); setColumns([]); onParsed?.([], []); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [file]);

  if (loading) return <div className="flex items-center gap-2 p-4 text-muted-foreground"><FileSpreadsheet className="w-5 h-5 animate-pulse" />Processando arquivo…</div>;
  if (error) return <div className="flex items-center gap-2 p-4 text-destructive"><AlertCircle className="w-5 h-5" />{error}</div>;

  const preview = data.slice(0, maxRows);
  const visibleCols = columns.slice(0, 15);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        <Badge variant="secondary"><CheckCircle2 className="w-3 h-3 mr-1" />{data.length} registros</Badge>
        <Badge variant="outline">{columns.length} colunas</Badge>
      </div>
      <div className="overflow-auto max-h-[300px] border rounded-lg">
        <Table>
          <TableHeader><TableRow><TableHead className="w-10">#</TableHead>
            {visibleCols.map(col => <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>)}
          </TableRow></TableHeader>
          <TableBody>
            {preview.map((row, i) => (
              <TableRow key={i}><TableCell className="text-xs">{i + 1}</TableCell>
                {visibleCols.map(col => <TableCell key={col} className="text-xs max-w-[150px] truncate">{row[col] != null ? String(row[col]) : ""}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
