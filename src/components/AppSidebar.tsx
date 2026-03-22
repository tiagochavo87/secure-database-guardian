import { LayoutDashboard, Database, GitBranch, Settings, LogOut, FlaskConical, ShieldCheck, Dna } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const baseItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Condições Clínicas DB", url: "/diseases", icon: FlaskConical },
  { title: "Configurações", url: "/settings", icon: Settings },
];

const adminItem = { title: "Administração", url: "/admin", icon: ShieldCheck };

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useAdminCheck();

  const items = isAdmin ? [...baseItems, adminItem] : baseItems;

  return (
    <Sidebar>
      <SidebarContent>
        <div className="p-4 flex items-center gap-3">
          <Dna className="w-8 h-8 text-[hsl(var(--sidebar-primary))]" />
          {!collapsed && (
            <div>
              <h1 className="font-bold text-sm text-sidebar-primary-foreground font-display">DBLAPOGE</h1>
              <p className="text-xs text-sidebar-foreground/60">Genética Humana</p>
            </div>
          )}
        </div>
        <Separator className="bg-sidebar-border" />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url}>
                      <item.icon className="w-4 h-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        {!collapsed && profile && (
          <div className="p-2 rounded-lg bg-sidebar-accent cursor-pointer mb-2" onClick={() => navigate("/settings")}>
            <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{profile.full_name || "Pesquisador"}</p>
            <p className="text-xs text-sidebar-foreground/60">{profile.role}</p>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground">
          <LogOut className="w-4 h-4 mr-2" />{!collapsed && "Sair"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
