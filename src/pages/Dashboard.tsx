// src/pages/Dashboard.tsx  ← substitui o arquivo atual
// Adiciona as novas abas: Calendário, Histórico e Importação

import { Scale, Calendar, Settings, History, LayoutGrid, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AudienciasList from "@/components/AudienciasList";
import AdminPanel from "@/components/AdminPanel";
import DashboardHome from "@/components/DashboardHome";
import CalendarioAudiencias from "@/components/CalendarioAudiencias";
import HistoricoSorteios from "@/components/HistoricoSorteios";
import ImportacaoSegura from "@/components/ImportacaoSegura";
import SorteioAudiencias from "@/components/SorteioAudiencias";

const Dashboard = () => (
  <div className="min-h-screen bg-background">
    <header className="border-b px-6 py-4 bg-sky-100">
      <div className="flex items-center justify-between max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <Scale className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Smaart Aud</h1>
            <p className="text-xs text-muted-foreground">Smaart Pauta</p>
          </div>
        </div>
      </div>
    </header>

    <main className="max-w-[1400px] mx-auto px-6 py-8">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="flex flex-wrap gap-1 h-auto mb-8">
          <TabsTrigger value="dashboard">
            <LayoutGrid className="h-4 w-4 mr-1.5" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="audiencias">
            <Calendar className="h-4 w-4 mr-1.5" />
            Audiências
          </TabsTrigger>
          <TabsTrigger value="calendario">
            <Calendar className="h-4 w-4 mr-1.5" />
            Calendário
          </TabsTrigger>
          <TabsTrigger value="sorteio">
            <History className="h-4 w-4 mr-1.5" />
            Sorteio
          </TabsTrigger>
          <TabsTrigger value="historico">
            <History className="h-4 w-4 mr-1.5" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="importacao">
            <Upload className="h-4 w-4 mr-1.5" />
            Importação
          </TabsTrigger>
          <TabsTrigger value="admin">
            <Settings className="h-4 w-4 mr-1.5" />
            Admin
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardHome />
        </TabsContent>
        <TabsContent value="audiencias">
          <AudienciasList />
        </TabsContent>
        <TabsContent value="calendario">
          <CalendarioAudiencias />
        </TabsContent>
        <TabsContent value="sorteio">
          <SorteioAudiencias />
        </TabsContent>
        <TabsContent value="historico">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Histórico de Sorteios</h2>
            <HistoricoSorteios />
          </div>
        </TabsContent>
        <TabsContent value="importacao">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Importação de Planilha</h2>
            <ImportacaoSegura />
          </div>
        </TabsContent>
        <TabsContent value="admin">
          <AdminPanel />
        </TabsContent>
      </Tabs>
    </main>
  </div>
);

export default Dashboard;

// ─── SQL para criar a tabela historico_sorteios no Supabase ──────────────────
// Execute no SQL Editor do Supabase:
//
// create table if not exists historico_sorteios (
//   id uuid primary key default gen_random_uuid(),
//   executado_em timestamptz not null default now(),
//   total integer not null default 0,
//   atribuidas integer not null default 0,
//   presenciais integer not null default 0,
//   sem_disponivel integer not null default 0,
//   detalhes text,
//   created_at timestamptz default now()
// );
//
// alter table historico_sorteios enable row level security;
// create policy "Leitura pública" on historico_sorteios for select using (true);
// create policy "Inserção autenticada" on historico_sorteios for insert with check (true);
