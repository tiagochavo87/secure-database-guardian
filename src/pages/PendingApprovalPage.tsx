import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, LogOut, Dna } from "lucide-react";

export default function PendingApprovalPage() {
  const { signOut, profile } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full shadow-xl">
        <CardContent className="pt-8 pb-6 px-8 text-center">
          <Dna className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold font-display mb-4">Aguardando Aprovação</h2>
          <p className="text-muted-foreground mb-2">
            Olá{profile?.full_name ? `, ${profile.full_name}` : ""}!
          </p>
          <p className="text-muted-foreground mb-6">
            Seu cadastro foi recebido e está aguardando aprovação de um administrador.
          </p>
          <Button variant="outline" onClick={signOut} className="gap-2">
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
