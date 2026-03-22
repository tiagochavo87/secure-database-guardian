import { SidebarTrigger } from "@/components/ui/sidebar";
import { Dna } from "lucide-react";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card px-4">
      <SidebarTrigger />
      <div className="flex items-center gap-2">
        <Dna className="w-5 h-5 text-primary" />
        <span className="font-display font-semibold text-sm">DBLAPOGE</span>
      </div>
    </header>
  );
}
