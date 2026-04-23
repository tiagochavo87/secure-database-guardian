import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, LogOut } from "lucide-react";
import logo from "@/assets/logo-lapoge.png";

export default function PendingApprovalPage() {
  const { signOut, profile } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(220,35%,14%)] via-[hsl(220,30%,18%)] to-[hsl(210,40%,12%)]">
      <Card className="w-full max-w-md border-0 shadow-2xl bg-card/95 backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 px-8 text-center">
          <img src={logo} alt="LAPOGE" className="h-10 mx-auto mb-4" />
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center">
              <Clock className="h-8 w-8 text-[hsl(40,92%,50%)]" />
            </div>
          </div>
          <h2 className="text-xl font-bold font-display mb-2">Aguardando Aprovação</h2>
          <p className="text-sm text-muted-foreground mb-2">
            Olá{profile?.full_name ? `, ${profile.full_name}` : ""}!
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Seu cadastro foi recebido e está aguardando aprovação de um administrador.
            Você receberá acesso ao sistema assim que for aprovado.
          </p>
          <Button variant="outline" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
