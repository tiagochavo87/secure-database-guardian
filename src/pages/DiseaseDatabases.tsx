import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Database, FlaskConical, Trash2, Search, X, Upload } from "lucide-react";
import { toast } from "sonner";
import DatabaseVariables from "@/components/DatabaseVariables";
import DatabaseVersions from "@/components/DatabaseVersions";
import { logActivity } from "@/lib/activityLog";
import { parseUploadedFile } from "@/lib/fileParser";
import FilePreview from "@/components/FilePreview";
import { createVersionBackup } from "@/lib/backupService";

interface DiseaseDB {
  id: string; name: string; disease: string; description: string;
  created_by: string; created_at: string; updated_at: string;
}

export default function DiseaseDatabases() {
  const { user } = useAuth();
  const [databases, setDatabases] = useState<DiseaseDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedDb, setSelectedDb] = useState<DiseaseDB | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [name, setName] = useState("");
  const [disease, setDisease] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchDatabases = async () => {
    const { data, error } = await supabase.from("disease_databases").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar bancos de dados");
    else setDatabases(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchDatabases(); }, []);

  const inferType = (data: Record<string, unknown>[], col: string): string => {
    const samples = data.slice(0, 50).map(r => r[col]).filter(v => v != null && v !== "");
    if (samples.length === 0) return "text";
    const allNumbers = samples.every(v => !isNaN(Number(v)));
    if (allNumbers) return samples.every(v => Number.isInteger(Number(v))) ? "integer" : "number";
    if (samples.every(v => /^[ACGT]{2}$/i.test(String(v)))) return "genotype";
    return "text";
  };

  const handleCreate = async () => {
    if (!name.trim() || !disease.trim() || !user) return;
    setUploading(true);
    try {
      const { data: dbData, error: dbError } = await supabase.from("disease_databases").insert({
        name: name.trim(), disease: disease.trim(), description: description.trim(), created_by: user.id,
      }).select("id").single();
      if (dbError || !dbData) { toast.error("Erro ao criar banco de dados"); setUploading(false); return; }
      await logActivity("database_created", "database", dbData.id, { name: name.trim(), disease: disease.trim() });

      if (previewData.length > 0 && previewColumns.length > 0) {
        const variableInserts = previewColumns.map((col, i) => ({
          database_id: dbData.id, name: col, variable_type: inferType(previewData, col),
          category: "Geral", description: "", sort_order: i,
        }));
        await supabase.from("database_variables").insert(variableInserts);

        const { error: verError } = await supabase.from("database_versions").insert({
          database_id: dbData.id, name: `v1.0 - Importação Inicial`, version_number: "1.0",
          row_count: previewData.length, data: previewData as any, created_by: user.id,
        });
        if (!verError) {
          // AUTO BACKUP: Create backup when first version is created
          await createVersionBackup(dbData.id, "initial_import");
          toast.success(`Banco criado com ${previewData.length} registros! Backup automático criado.`);
        }
      } else {
        toast.success("Banco de dados criado!");
      }

      setName(""); setDisease(""); setDescription(""); setSelectedFile(null); setPreviewData([]); setPreviewColumns([]);
      setCreateOpen(false);
      fetchDatabases();
    } finally { setUploading(false); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("disease_databases").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Banco excluído"); if (selectedDb?.id === id) setSelectedDb(null); fetchDatabases(); }
  };

  const filteredDatabases = databases.filter(db =>
    !searchQuery || db.name.toLowerCase().includes(searchQuery.toLowerCase()) || db.disease.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedDb) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setSelectedDb(null)}>← Voltar</Button>
        <h2 className="text-2xl font-bold font-display">{selectedDb.name}</h2>
        <Badge variant="secondary">Condição Clínica DB: {selectedDb.disease}</Badge>
        <Tabs defaultValue="variables">
          <TabsList><TabsTrigger value="variables">Variáveis</TabsTrigger><TabsTrigger value="versions">Versões & Dados</TabsTrigger></TabsList>
          <TabsContent value="variables"><DatabaseVariables databaseId={selectedDb.id} /></TabsContent>
          <TabsContent value="versions"><DatabaseVersions databaseId={selectedDb.id} /></TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold font-display">Bancos de Dados</h2><p className="text-muted-foreground">Gerencie bancos de dados por condição clínica</p></div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />Novo Banco</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Criar Banco de Dados</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Nome do banco" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Condição clínica" value={disease} onChange={(e) => setDisease(e.target.value)} />
              <Textarea placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
              <div>
                <label className="text-sm font-medium">Arquivo de dados (opcional)</label>
                <Input type="file" accept=".xlsx,.xls,.csv,.txt" onChange={(e) => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }} />
              </div>
              {selectedFile && <FilePreview file={selectedFile} onParsed={(data, cols) => { setPreviewData(data); setPreviewColumns(cols); }} />}
              <Button onClick={handleCreate} disabled={uploading || !name.trim() || !disease.trim()} className="w-full">
                {uploading ? "Criando..." : "Criar Banco de Dados"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative"><Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar bancos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        {searchQuery && <button className="absolute right-3 top-3" onClick={() => setSearchQuery("")}><X className="w-4 h-4" /></button>}
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDatabases.map((db) => (
            <Card key={db.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedDb(db)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2"><Database className="w-5 h-5 text-primary" />{db.name}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(db.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
                <CardDescription><Badge variant="secondary"><FlaskConical className="w-3 h-3 mr-1" />{db.disease}</Badge></CardDescription>
              </CardHeader>
              <CardContent><p className="text-sm text-muted-foreground line-clamp-2">{db.description || "Sem descrição"}</p></CardContent>
            </Card>
          ))}
          {filteredDatabases.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">Nenhum banco de dados encontrado.</p>}
        </div>
      )}
    </div>
  );
}
