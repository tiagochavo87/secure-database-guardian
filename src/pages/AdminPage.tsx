import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Shield, Users } from "lucide-react";
import { logActivity } from "@/lib/activityLog";

interface UserProfile { id: string; user_id: string; full_name: string; role: string; laboratory: string; institution: string; approved: boolean; created_at: string; }
interface UserRole { user_id: string; role: "admin" | "moderator" | "user"; }

export default function AdminPage() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkAdmin(); }, [user]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("*").eq("user_id", user.id).eq("role", "admin");
    if (!data || data.length === 0) { setIsAdmin(false); setLoading(false); return; }
    setIsAdmin(true);
    await loadData();
    setLoading(false);
  };

  const loadData = async () => {
    const [p, r] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
    ]);
    if (p.data) setProfiles(p.data as UserProfile[]);
    if (r.data) setUserRoles(r.data as UserRole[]);
  };

  const toggleApproval = async (profile: UserProfile) => {
    const { error } = await supabase.from("profiles").update({ approved: !profile.approved }).eq("id", profile.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: profile.approved ? "Revogado" : "Aprovado" }); await logActivity(profile.approved ? "user_revoked" : "user_approved", "user", profile.user_id, { user_name: profile.full_name }); loadData(); }
  };

  const setRole = async (userId: string, role: "admin" | "moderator" | "user") => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    await supabase.from("user_roles").insert({ user_id: userId, role });
    toast({ title: "Permissão atualizada" });
    loadData();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!isAdmin) return <Card><CardContent className="py-12 text-center"><h2 className="text-xl font-bold">Acesso Restrito</h2></CardContent></Card>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display">Administração</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent><span className="text-2xl font-bold">{profiles.length}</span></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Aprovados</CardTitle></CardHeader><CardContent><span className="text-2xl font-bold text-[hsl(var(--success))]">{profiles.filter(p => p.approved).length}</span></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pendentes</CardTitle></CardHeader><CardContent><span className="text-2xl font-bold text-[hsl(var(--warning))]">{profiles.filter(p => !p.approved).length}</span></CardContent></Card>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Nível</TableHead><TableHead>Instituição</TableHead><TableHead>Status</TableHead><TableHead>Permissão</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {profiles.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name || "Sem nome"}</TableCell>
                  <TableCell>{p.role}</TableCell>
                  <TableCell>{p.institution || "—"}</TableCell>
                  <TableCell><Badge variant={p.approved ? "default" : "secondary"}>{p.approved ? "Aprovado" : "Pendente"}</Badge></TableCell>
                  <TableCell>
                    <Select value={userRoles.find(r => r.user_id === p.user_id)?.role || "user"} onValueChange={(v) => setRole(p.user_id, v as any)} disabled={p.user_id === user?.id}>
                      <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="user">Usuário</SelectItem><SelectItem value="moderator">Moderador</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={() => toggleApproval(p)} disabled={p.user_id === user?.id}>{p.approved ? "Revogar" : "Aprovar"}</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
