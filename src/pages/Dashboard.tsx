import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
import smaartTec from "@/assets/smaart-tec.png";
import smLab from "@/assets/sm-lab.png";
import smaartLogo from "@/assets/smaart-logo.png";

const MENU_ITEMS = [
  { key: "home", label: "Home", icon: LayoutGrid },
  { key: "importacao", label: "Importar Pauta", icon: Upload },
  { key: "sorteio", label: "Distribuição", icon: Shuffle },
  { key: "audiencias", label: "Audiências", icon: Scale },
  { key: "calendario", label: "Calendário", icon: Calendar },
  { key: "equipe", label: "Colaboradores", icon: Users },
  { key: "admin", label: "Administrador", icon: Settings },
];

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "home");
  const [collapsed, setCollapsed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleImportComplete = () => {
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

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
        <div className="flex items-center gap-2.5 px-5 py-6 border-b border-sidebar-border/60 bg-sidebar-accent/20 shadow-[0_1px_3px_0_hsl(var(--sidebar-border)/0.15)]">
          <img src={smaartLogo} alt="Smaart Aud" className="h-10 w-10 shrink-0 object-contain rounded-lg" />
          {!collapsed && (
            <div className="overflow-hidden min-w-0">
              <h1 className="text-[15px] font-semibold text-sidebar-foreground leading-snug tracking-tight">Smaart Aud</h1>
              <p className="text-[10.5px] text-sidebar-foreground/55 leading-tight mt-0.5">Gestão de Pautas</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {MENU_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
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

        {/* Footer logos */}
        {!collapsed && (
          <div className="flex items-center justify-center gap-4 px-4 py-4 border-t border-sidebar-border">
            <img src={smaartTec} alt="Smaart Tec" className="h-5 object-contain" />
            <img src={smLab} alt="SM Lab" className="h-8 object-contain" />
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-center py-3 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-scroll h-screen">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          {activeTab === "home" && <DashboardHome key={refreshKey} />}
          {activeTab === "importacao" && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Importação de Planilha</h2>
              <ImportacaoSegura onImportComplete={handleImportComplete} />
            </div>
          )}
          {activeTab === "sorteio" && <SorteioAudiencias key={refreshKey} />}
          {activeTab === "audiencias" && <AudienciasList key={refreshKey} />}
          {activeTab === "calendario" && <CalendarioAudiencias key={refreshKey} />}
          {activeTab === "equipe" && <PessoasList key={refreshKey} />}
          {activeTab === "admin" && <AdminPanel key={refreshKey} />}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
