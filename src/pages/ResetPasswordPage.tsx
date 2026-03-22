import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, AlertCircle, CheckCircle, Dna } from "lucide-react";
import { useEffect } from "react";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setIsRecovery(true);
    });
    if (window.location.hash.includes("type=recovery")) setIsRecovery(true);
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (password.length < 6) { setError("A senha deve ter pelo menos 6 caracteres."); return; }
    if (password !== confirmPassword) { setError("As senhas não coincidem."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); } else {
      setSuccess("Senha atualizada com sucesso! Redirecionando...");
      setTimeout(() => navigate("/login"), 2000);
    }
    setLoading(false);
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full"><CardContent className="pt-8 text-center">
          <Dna className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-4">Link Inválido</h2>
          <Button onClick={() => navigate("/login")} className="w-full">Voltar ao Login</Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full"><CardContent className="pt-8 px-8">
        <Dna className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-xl font-bold text-center mb-6">Nova Senha</h2>
        {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4"><AlertCircle className="w-4 h-4" />{error}</div>}
        {success && <div className="flex items-center gap-2 p-3 rounded-lg bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] text-sm mb-4"><CheckCircle className="w-4 h-4" />{success}</div>}
        <form onSubmit={handleReset} className="space-y-4">
          <div><Label>Nova senha</Label>
            <div className="relative"><Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-11" required /></div>
          </div>
          <div><Label>Confirmar nova senha</Label>
            <div className="relative"><Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 h-11" required /></div>
          </div>
          <Button type="submit" className="w-full h-11" disabled={loading}>{loading ? "Atualizando..." : "Redefinir Senha"}</Button>
        </form>
      </CardContent></Card>
    </div>
  );
}
