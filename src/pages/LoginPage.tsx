import { useState } from "react";
import { Dna, Lock, Mail, AlertCircle, CheckCircle, User, FlaskConical, Building2, GraduationCap, UserCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLE_OPTIONS = ["Iniciação Científica", "Mestrando", "Doutorando", "Pós-Doc", "Docente"];

export default function LoginPage() {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [laboratory, setLaboratory] = useState("LAPOGE");
  const [role, setRole] = useState("");
  const [institution, setInstitution] = useState("");
  const [program, setProgram] = useState("");
  const [advisor, setAdvisor] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setEmail(""); setPassword(""); setFullName(""); setLaboratory("LAPOGE");
    setRole(""); setInstitution(""); setProgram(""); setAdvisor("");
    setError(""); setSuccess("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) setError("Credenciais inválidas. Verifique seu email e senha.");
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!email.trim()) { setError("Informe seu email."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { setError(error.message); }
    else { setSuccess("Email de recuperação enviado!"); }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!fullName.trim() || !role || !institution.trim()) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName.trim() } },
    });
    if (error) { setError(error.message); setLoading(false); return; }
    if (data.user) {
      await new Promise((r) => setTimeout(r, 1000));
      await supabase.from("profiles").update({
        full_name: fullName.trim(), role,
        laboratory: laboratory.trim(),
        institution: institution.trim(),
        program: program.trim(),
        advisor: advisor.trim(),
      } as any).eq("user_id", data.user.id);
    }
    await supabase.auth.signOut();
    setSuccess("Cadastro realizado! Aguarde a aprovação do administrador.");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 animate-pulse-glow" />
      </div>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[hsl(220,35%,14%)] to-[hsl(220,40%,8%)] items-center justify-center p-12 relative overflow-hidden">
        <div className="text-center relative z-10 animate-helix-float">
          <Dna className="w-20 h-20 text-[hsl(var(--accent))] mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-white font-display mb-4">DBLAPOGE</h1>
          <p className="text-[hsl(220,15%,70%)] text-lg max-w-md">
            Sistema de Gerenciamento de Banco de Dados Clínico e Laboratorial em Genética Humana
          </p>
        </div>
      </div>
      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md shadow-xl border-border/50">
          <CardContent className="pt-8 pb-6 px-8">
            <div className="text-center mb-8 lg:hidden">
              <Dna className="w-10 h-10 text-primary mx-auto mb-2" />
              <h2 className="text-xl font-bold font-display">DBLAPOGE</h2>
            </div>
            <h2 className="text-2xl font-bold font-display text-center mb-2">
              {mode === "login" ? "Acesso ao Sistema" : mode === "signup" ? "Novo Usuário" : "Recuperar Senha"}
            </h2>
            <p className="text-muted-foreground text-center text-sm mb-6">
              {mode === "login" ? "Insira suas credenciais para acessar" : mode === "signup" ? "Preencha seus dados para solicitar acesso" : "Informe seu email para recuperar"}
            </p>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] text-sm mb-4">
                <CheckCircle className="w-4 h-4 shrink-0" />
                {success}
              </div>
            )}

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div><Label>Email</Label>
                  <div className="relative"><Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" required /></div>
                </div>
                <div><div className="flex justify-between"><Label>Senha</Label>
                  <button type="button" className="text-xs text-primary hover:underline" onClick={() => { setMode("forgot"); resetForm(); }}>Esqueci minha senha</button></div>
                  <div className="relative"><Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-11" required /></div>
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading}>{loading ? "Verificando..." : "Entrar no Sistema"}</Button>
              </form>
            ) : mode === "forgot" ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div><Label>Email</Label>
                  <div className="relative"><Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" required /></div>
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading}>{loading ? "Enviando..." : "Enviar Link de Recuperação"}</Button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-3">
                <div><Label>Nome completo *</Label>
                  <div className="relative"><User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10 h-11" required /></div>
                </div>
                <div><Label>Email *</Label>
                  <div className="relative"><Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" required /></div>
                </div>
                <div><Label>Senha *</Label>
                  <div className="relative"><Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-11" required /></div>
                </div>
                <div><Label>Instituição *</Label>
                  <div className="relative"><Building2 className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input value={institution} onChange={(e) => setInstitution(e.target.value)} className="pl-10 h-11" required /></div>
                </div>
                <div><Label>Programa de Pós-Graduação</Label>
                  <div className="relative"><GraduationCap className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input value={program} onChange={(e) => setProgram(e.target.value)} className="pl-10 h-11" /></div>
                </div>
                <div><Label>Orientador(a)</Label>
                  <div className="relative"><UserCheck className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input value={advisor} onChange={(e) => setAdvisor(e.target.value)} className="pl-10 h-11" /></div>
                </div>
                <div><Label>Nível acadêmico *</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{ROLE_OPTIONS.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div><Label>Laboratório</Label>
                  <div className="relative"><FlaskConical className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input value={laboratory} onChange={(e) => setLaboratory(e.target.value)} className="pl-10 h-11" /></div>
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading}>{loading ? "Cadastrando..." : "Solicitar Cadastro"}</Button>
              </form>
            )}

            <div className="mt-6 text-center space-y-2">
              {mode !== "login" && (
                <button className="text-sm text-primary hover:underline" onClick={() => { setMode("login"); resetForm(); }}>Voltar ao login</button>
              )}
              {mode === "login" && (
                <button className="text-sm text-primary hover:underline" onClick={() => { setMode("signup"); resetForm(); }}>Novo usuário? Solicitar cadastro</button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
