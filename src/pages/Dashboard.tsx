import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Layers, Activity, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const { profile } = useAuth();
  const [databases, setDatabases] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [variables, setVariables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("disease_databases").select("id, name, disease").order("name"),
      supabase.from("database_versions").select("id, name, database_id, row_count, created_at").order("created_at", { ascending: false }),
      supabase.from("database_variables").select("id, name, database_id").order("sort_order"),
    ]).then(([dbRes, verRes, varRes]) => {
      setDatabases(dbRes.data || []);
      setVersions(verRes.data || []);
      setVariables(varRes.data || []);
      setLoading(false);
    });
  }, []);

  const totalRecords = versions.reduce((s: number, v: any) => s + (v.row_count || 0), 0);
  const kpis = [
    { title: "Bancos de Dados", value: databases.length, icon: Database, color: "text-primary" },
    { title: "Versões", value: versions.length, icon: Layers, color: "text-accent" },
    { title: "Variáveis", value: variables.length, icon: Activity, color: "text-primary" },
    { title: "Registros Totais", value: totalRecords.toLocaleString("pt-BR"), icon: Users, color: "text-accent" },
  ];

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-display">Dashboard</h2>
        <p className="text-muted-foreground">Panorama geral dos bancos de dados genômicos</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle></CardHeader>
            <CardContent><div className={`text-3xl font-bold ${kpi.color} flex items-center gap-2`}><kpi.icon className="w-6 h-6" />{kpi.value}</div></CardContent>
          </Card>
        ))}
      </div>
      {databases.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Nenhum banco de dados cadastrado ainda. Vá para "Condições Clínicas DB" para criar um.
        </CardContent></Card>
      )}
    </div>
  );
}
