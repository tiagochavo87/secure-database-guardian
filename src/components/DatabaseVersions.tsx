import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Upload, Download, FileSpreadsheet, Calendar, Layers, ChevronLeft, ChevronRight, Archive } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { logActivity } from "@/lib/activityLog";
import { parseUploadedFile } from "@/lib/fileParser";
import FilePreview from "@/components/FilePreview";
import { createVersionBackup, createSingleVersionBackup, restoreFromBackup } from "@/lib/backupService";

interface Version {
  id: string; database_id: string; name: string; version_number: string;
  row_count: number; data: Record<string, unknown>[]; created_by: string; created_at: string;
}

interface Backup {
  id: string; version_id: string; version_name: string; version_number: string;
  row_count: number; backup_reason: string; created_at: string;
}

const PAGE_SIZES = [10, 25, 50];

export default function DatabaseVersions({ databaseId }: { databaseId: string }) {
  const { user } = useAuth();
  const [versions, setVersions] = useState<Version[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [backupsOpen, setBackupsOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [versionName, setVersionName] = useState("");
  const [versionNumber, setVersionNumber] = useState("1.0");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const fetchData = async () => {
    const [versionsRes, backupsRes] = await Promise.all([
      supabase.from("database_versions").select("*").eq("database_id", databaseId).order("created_at", { ascending: false }),
      supabase.from("version_backups").select("id, version_id, version_name, version_number, row_count, backup_reason, created_at").eq("database_id", databaseId).order("created_at", { ascending: false }),
    ]);
    if (versionsRes.data) {
      setVersions(versionsRes.data.map(v => ({ ...v, data: Array.isArray(v.data) ? v.data as Record<string, unknown>[] : [] })));
    }
    setBackups(backupsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [databaseId]);

  const handleFileUpload = async () => {
    if (!user || previewData.length === 0) return;
    const finalName = versionName.trim() || `v${versionNumber} - upload`;

    // AUTO BACKUP: Backup all existing versions before creating new one
    if (versions.length > 0) {
      await createVersionBackup(databaseId, "pre_new_version");
      toast.info("Backup automático das versões existentes criado!");
    }

    const { error } = await supabase.from("database_versions").insert({
      database_id: databaseId, name: finalName, version_number: versionNumber.trim() || "1.0",
      row_count: previewData.length, data: previewData as any, created_by: user.id,
    });
    if (error) { toast.error("Erro ao criar versão: " + error.message); }
    else {
      toast.success(`Versão "${finalName}" criada com ${previewData.length} registros!`);
      await logActivity("version_created", "version", undefined, { name: finalName, records: previewData.length });
      setVersionName(""); setVersionNumber("1.0"); setSelectedFile(null); setPreviewData([]); setPreviewColumns([]);
      setCreateOpen(false);
      fetchData();
    }
  };

  const handleRestore = async (backupId: string) => {
    const { error } = await restoreFromBackup(backupId);
    if (error) toast.error("Erro ao restaurar backup");
    else { toast.success("Versão restaurada do backup!"); setBackupsOpen(false); fetchData(); }
  };

  const activeVersion = selectedVersion || (versions.length > 0 ? versions[0] : null);
  const activeData = activeVersion?.data || [];
  const columns = activeData.length > 0 ? Object.keys(activeData[0]) : [];
  const totalPages = Math.max(1, Math.ceil(activeData.length / pageSize));
  const pageData = activeData.slice(page * pageSize, (page + 1) * pageSize);

  const exportData = (format: "xlsx" | "txt") => {
    if (!activeData.length) return;
    if (format === "xlsx") {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(activeData), "Dados");
      XLSX.writeFile(wb, `${activeVersion?.name || "dados"}.xlsx`);
      toast.success("Arquivo XLS exportado!");
    } else {
      const header = columns.join("\t");
      const rows = activeData.map(r => columns.map(c => String(r[c] ?? "")).join("\t"));
      const blob = new Blob([[header, ...rows].join("\n")], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${activeVersion?.name || "dados"}.txt`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Arquivo TXT exportado!");
    }
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h3 className="text-lg font-semibold font-display">Versões & Dados</h3><p className="text-sm text-muted-foreground">{versions.length} versões disponíveis</p></div>
        <div className="flex gap-2">
          <Dialog open={backupsOpen} onOpenChange={setBackupsOpen}>
            <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-1"><Archive className="w-4 h-4" />Backups ({backups.length})</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Backups de Versões</DialogTitle></DialogHeader>
              {backups.length === 0 ? <p className="text-muted-foreground text-center py-4">Nenhum backup disponível.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Versão</TableHead><TableHead>Nº</TableHead><TableHead>Registros</TableHead><TableHead>Motivo</TableHead><TableHead>Data</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {backups.map(b => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.version_name}</TableCell>
                        <TableCell>{b.version_number}</TableCell>
                        <TableCell>{b.row_count}</TableCell>
                        <TableCell><Badge variant="outline">{b.backup_reason === "auto" ? "Automático" : b.backup_reason === "pre_new_version" ? "Pré-nova versão" : b.backup_reason === "initial_import" ? "Import. Inicial" : b.backup_reason}</Badge></TableCell>
                        <TableCell className="text-sm">{new Date(b.created_at).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell><Button size="sm" variant="outline" onClick={() => handleRestore(b.id)}>Restaurar</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </DialogContent>
          </Dialog>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="w-4 h-4" />Nova Versão</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Upload de Nova Versão</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input type="file" accept=".xlsx,.xls,.csv,.txt" onChange={(e) => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }} />
                {selectedFile && <FilePreview file={selectedFile} onParsed={(data, cols) => { setPreviewData(data); setPreviewColumns(cols); }} />}
                <Input placeholder="Nome da versão" value={versionName} onChange={(e) => setVersionName(e.target.value)} />
                <Input placeholder="Número (ex: 1.0)" value={versionNumber} onChange={(e) => setVersionNumber(e.target.value)} />
                <Button onClick={handleFileUpload} disabled={previewData.length === 0} className="w-full">Criar Versão ({previewData.length} registros)</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {versions.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {versions.map(v => (
            <Badge key={v.id} variant={v.id === activeVersion?.id ? "default" : "outline"} className="cursor-pointer" onClick={() => { setSelectedVersion(v); setPage(0); }}>
              {v.name} · v{v.version_number} · {v.row_count} reg
            </Badge>
          ))}
        </div>
      )}

      {activeVersion && columns.length > 0 && (
        <>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => exportData("xlsx")}><FileSpreadsheet className="w-4 h-4 mr-1" />XLS</Button>
            <Button size="sm" variant="outline" onClick={() => exportData("txt")}><Download className="w-4 h-4 mr-1" />TXT</Button>
          </div>
          <div className="overflow-auto border rounded-lg">
            <Table>
              <TableHeader><TableRow>{columns.slice(0, 15).map(col => <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {pageData.map((row, i) => (
                  <TableRow key={i}>{columns.slice(0, 15).map(col => <TableCell key={col} className="text-xs max-w-[120px] truncate">{row[col] != null ? String(row[col]) : "—"}</TableCell>)}</TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Página {page + 1} de {totalPages}</span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </>
      )}
      {versions.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma versão disponível. Faça upload de dados.</CardContent></Card>}
    </div>
  );
}
