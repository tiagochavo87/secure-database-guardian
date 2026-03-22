import { useState, useCallback } from "react";
import { useVersion } from "@/contexts/VersionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Calendar } from "lucide-react";
import { ALL_COLUMNS } from "@/data/mockData";

export default function VersionManager() {
  const { versions, addVersion } = useVersion();
  const [versionName, setVersionName] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) setSelectedFile(e.dataTransfer.files[0]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
  };

  const handleUpload = () => {
    if (!versionName.trim()) return;
    const newVersion = {
      id: `v${Date.now()}`,
      name: versionName,
      createdAt: new Date().toISOString().slice(0, 10),
      rowCount: Math.floor(Math.random() * 200) + 100,
      columnCount: ALL_COLUMNS.length,
    };
    addVersion(newVersion);
    setVersionName("");
    setSelectedFile(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Gerenciador de Versões</h2>
        <p className="text-sm text-muted-foreground">Faça upload de novas versões do banco de dados</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova Versão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder='Nome da versão (ex: "v2.1 - Revisada")'
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
          />
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors cursor-pointer ${
              dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            <Upload className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">
              {selectedFile ? selectedFile.name : "Arraste um arquivo CSV/Excel ou clique para selecionar"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">.csv, .xlsx, .xls</p>
            <input
              id="file-upload"
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>
          <Button onClick={handleUpload} disabled={!versionName.trim() || !selectedFile} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Criar Versão
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Versões Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead>Registros</TableHead>
                <TableHead>Colunas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-xs">{v.id}</Badge>
                      {v.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {v.createdAt}
                    </div>
                  </TableCell>
                  <TableCell>{v.rowCount}</TableCell>
                  <TableCell>{v.columnCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
