import { useState } from "react";
import {
  LayoutGrid, Upload, Shuffle, Scale, Calendar, Users, Settings, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AudienciasList from "@/components/AudienciasList";
import AdminPanel from "@/components/AdminPanel";
import DashboardHome from "@/components/DashboardHome";
import CalendarioAudiencias from "@/components/CalendarioAudiencias";
import ImportacaoSegura from "@/components/ImportacaoSegura";
import SorteioAudiencias from "@/components/SorteioAudiencias";
import PessoasList from "@/components/PessoasList";

const MENU_ITEMS = [
  { key: "home", label: "Home", icon: LayoutGrid },
  { key: "importacao", label: "Importação", icon: Upload },
  { key: "sorteio", label: "Sorteio", icon: Shuffle },
  { key: "audiencias", label: "Audiências", icon: Scale },
  { key: "calendario", label: "Calendário", icon: Calendar },
  { key: "equipe", label: "Equipe", icon: Users },
  { key: "admin", label: "Admin", icon: Settings },
];

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 shrink-0",
          collapsed ? "w-[68px]" : "w-[220px]"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
          <div className="h-9 w-9 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <Scale className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-sidebar-foreground leading-tight">Smaart Aud</h1>
              <p className="text-[11px] text-sidebar-accent-foreground/60">Gestão de Pautas</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {MENU_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                activeTab === key
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-center py-3 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          {activeTab === "home" && <DashboardHome />}
          {activeTab === "importacao" && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Importação de Planilha</h2>
              <ImportacaoSegura />
            </div>
          )}
          {activeTab === "sorteio" && <SorteioAudiencias />}
          {activeTab === "audiencias" && <AudienciasList />}
          {activeTab === "calendario" && <CalendarioAudiencias />}
          {activeTab === "equipe" && <PessoasList />}
          {activeTab === "admin" && <AdminPanel />}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
