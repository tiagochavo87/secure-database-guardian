import { SidebarTrigger } from "@/components/ui/sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVersion } from "@/contexts/VersionContext";
import { GitBranch, Dna } from "lucide-react";

export function AppHeader() {
  const { versions, selectedVersionId, setSelectedVersionId } = useVersion();

  return (
    <header className="h-14 flex items-center justify-between border-b bg-card/80 backdrop-blur-sm px-4 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
        <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
          <Dna className="h-4 w-4 text-accent" />
          <span className="text-xs font-medium uppercase tracking-wider">Banco de Dados Genômico</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedVersionId} onValueChange={setSelectedVersionId}>
          <SelectTrigger className="w-[220px] h-9 text-sm border-border/60">
            <SelectValue placeholder="Selecione a versão" />
          </SelectTrigger>
          <SelectContent>
            {versions.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </header>
  );
}
