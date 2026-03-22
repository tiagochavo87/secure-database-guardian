import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activityLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { User, Save } from "lucide-react";

const ROLE_OPTIONS = ["Iniciação Científica", "Mestrando", "Doutorando", "Pós-Doc", "Docente"];

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [laboratory, setLaboratory] = useState("");
  const [institution, setInstitution] = useState("");
  const [program, setProgram] = useState("");
  const [advisor, setAdvisor] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setRole(profile.role || "");
      setLaboratory(profile.laboratory || "");
      setInstitution(profile.institution || "");
      setProgram(profile.program || "");
      setAdvisor(profile.advisor || "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName.trim(), role, laboratory: laboratory.trim(),
      institution: institution.trim(), program: program.trim(), advisor: advisor.trim(),
    } as any).eq("user_id", user.id);
    if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    else { toast({ title: "Perfil atualizado com sucesso" }); await logActivity("profile_updated", "profile", user.id, { full_name: fullName.trim() }); }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div><h2 className="text-2xl font-bold font-display">Configurações</h2><p className="text-muted-foreground">Gerencie seu perfil</p></div>
      <Card><CardHeader><CardTitle>Meu Perfil</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Nome completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div><Label>Nível Acadêmico</Label>
            <Select value={role} onValueChange={setRole}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROLE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Instituição</Label><Input value={institution} onChange={(e) => setInstitution(e.target.value)} /></div>
          <div><Label>Programa</Label><Input value={program} onChange={(e) => setProgram(e.target.value)} /></div>
          <div><Label>Orientador(a)</Label><Input value={advisor} onChange={(e) => setAdvisor(e.target.value)} /></div>
          <div><Label>Laboratório</Label><Input value={laboratory} onChange={(e) => setLaboratory(e.target.value)} /></div>
          <Button onClick={handleSave} disabled={saving} className="gap-2"><Save className="w-4 h-4" />{saving ? "Salvando..." : "Salvar Perfil"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
