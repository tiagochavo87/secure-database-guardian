import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activityLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { User, Save, Building2, GraduationCap, UserCheck } from "lucide-react";

const ROLE_OPTIONS = [
  "Iniciação Científica",
  "Mestrando",
  "Doutorando",
  "Pós-Doc",
  "Docente",
];

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
      setInstitution((profile as any).institution || "");
      setProgram((profile as any).program || "");
      setAdvisor((profile as any).advisor || "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        role,
        laboratory: laboratory.trim(),
        institution: institution.trim(),
        program: program.trim(),
        advisor: advisor.trim(),
      } as any)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado com sucesso" });
      await logActivity("profile_updated", "profile", user.id, { full_name: fullName.trim() });
    }
    setSaving(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-display">Configurações</h2>
        <p className="text-sm text-muted-foreground">Gerencie seu perfil e configurações do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Meu Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome completo" maxLength={100} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Nível Acadêmico</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Selecione seu nível" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="institution" className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                Instituição de Vínculo
              </Label>
              <Input id="institution" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Ex: UFSC, USP, UNICAMP" maxLength={150} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="program" className="flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                Programa de Pós-Graduação
              </Label>
              <Input id="program" value={program} onChange={(e) => setProgram(e.target.value)} placeholder="Ex: PPG em Genética" maxLength={200} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="advisor" className="flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                Orientador(a)
              </Label>
              <Input id="advisor" value={advisor} onChange={(e) => setAdvisor(e.target.value)} placeholder="Nome do(a) orientador(a)" maxLength={100} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="laboratory">Laboratório</Label>
              <Input id="laboratory" value={laboratory} onChange={(e) => setLaboratory(e.target.value)} placeholder="Ex: LAPOGE" maxLength={100} />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Perfil"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sobre o Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Aplicação</span>
            <span className="font-medium">DBLAPOGE</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Versão do Sistema</span>
            <Badge variant="secondary">1.0.0</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Laboratório</span>
            <span className="font-medium">LAPOGE - Laboratório de Polimorfismos Genéticos</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
