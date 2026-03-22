import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Variable {
  id: string; database_id: string; name: string; variable_type: string; category: string; description: string; sort_order: number;
}

const VARIABLE_TYPES = [
  { value: "text", label: "Texto" }, { value: "number", label: "Numérico" },
  { value: "integer", label: "Inteiro" }, { value: "boolean", label: "Sim/Não" },
  { value: "date", label: "Data" }, { value: "genotype", label: "Genótipo" },
  { value: "category", label: "Categórico" },
];

const DEFAULT_CATEGORIES = ["Demografia", "Genética e Imunologia", "Desfechos", "Sintomas", "Comorbidades", "Exames Hematológicos", "Exames Bioquímicos", "Gasometria", "Biomarcadores", "Geral"];

export default function DatabaseVariables({ databaseId }: { databaseId: string }) {
  const [variables, setVariables] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [varType, setVarType] = useState("text");
  const [category, setCategory] = useState("Geral");
  const [description, setDescription] = useState("");

  const fetchVariables = async () => {
    const { data } = await supabase.from("database_variables").select("*").eq("database_id", databaseId).order("sort_order");
    setVariables(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchVariables(); }, [databaseId]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("database_variables").insert({
      database_id: databaseId, name: name.trim(), variable_type: varType,
      category: category || "Geral", description: description.trim(), sort_order: variables.length,
    });
    if (error) toast.error("Erro ao adicionar");
    else { toast.success("Variável adicionada!"); setName(""); setVarType("text"); setCategory("Geral"); setDescription(""); setAddOpen(false); fetchVariables(); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("database_variables").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Variável excluída"); fetchVariables(); }
  };

  const grouped = variables.reduce<Record<string, Variable[]>>((acc, v) => {
    (acc[v.category] = acc[v.category] || []).push(v);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle>Variáveis</CardTitle><p className="text-sm text-muted-foreground">{variables.length} variáveis definidas</p></div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="w-4 h-4" />Adicionar</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Variável</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Nome da variável" value={name} onChange={(e) => setName(e.target.value)} />
                <Select value={varType} onValueChange={setVarType}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{VARIABLE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select>
                <Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEFAULT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                <Input placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
                <Button onClick={handleAdd} className="w-full">Adicionar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div> : variables.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma variável definida.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([cat, vars]) => (
              <div key={cat}>
                <h4 className="font-semibold text-sm mb-2">{cat} <Badge variant="secondary">{vars.length}</Badge></h4>
                <Table>
                  <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {vars.map(v => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.name}</TableCell>
                        <TableCell><Badge variant="outline">{VARIABLE_TYPES.find(t => t.value === v.variable_type)?.label || v.variable_type}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{v.description || "—"}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
