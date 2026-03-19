import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Scale, Users } from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Audiencia = {
  carteira: string | null;
  data_audiencia: string | null;
  status: string;
};

type FilterPeriod = "dia" | "semana" | "mes";

const DashboardHome = () => {
  const [stats, setStats] = useState({
    audienciasEstaSemana: 0,
    pendentesSorteio: 0,
    advogadosCadastrados: 0,
    prepostosCadastrados: 0,
    audienciasDesignadas: 0,
    totalAudiencias: 0,
  });
  const [audiencias, setAudiencias] = useState<Audiencia[]>([]);
  const [filtro, setFiltro] = useState<FilterPeriod>("semana");

  const { inicio, fim } = useMemo(() => {
    const hoje = new Date();
    switch (filtro) {
      case "dia":
        return { inicio: startOfDay(hoje), fim: endOfDay(hoje) };
      case "semana":
        return { inicio: startOfWeek(hoje, { weekStartsOn: 0 }), fim: endOfWeek(hoje, { weekStartsOn: 0 }) };
      case "mes":
        return { inicio: startOfMonth(hoje), fim: endOfMonth(hoje) };
    }
  }, [filtro]);

  useEffect(() => {
    const fetchStats = async () => {
      const hoje = new Date();
      const inicioSemana = startOfWeek(hoje, { weekStartsOn: 0 });
      const fimSemana = endOfWeek(hoje, { weekStartsOn: 0 });

      const { count: audienciasCount } = await supabase
        .from("audiencias")
        .select("*", { count: "exact", head: true })
        .gte("data_audiencia", inicioSemana.toISOString())
        .lte("data_audiencia", fimSemana.toISOString());

      const { count: pendentesCount } = await supabase
        .from("audiencias")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente");

      const { count: advogadosCount } = await supabase
        .from("pessoas")
        .select("*", { count: "exact", head: true })
        .eq("tipo", "advogado")
        .eq("ativo", true);

      const { count: prepostosCount } = await supabase
        .from("pessoas")
        .select("*", { count: "exact", head: true })
        .eq("tipo", "preposto")
        .eq("ativo", true);

      const { count: designadasCount } = await supabase
        .from("audiencias")
        .select("*", { count: "exact", head: true })
        .eq("status", "atribuida");

      const { count: totalCount } = await supabase
        .from("audiencias")
        .select("*", { count: "exact", head: true });

      setStats({
        audienciasEstaSemana: audienciasCount || 0,
        pendentesSorteio: pendentesCount || 0,
        advogadosCadastrados: advogadosCount || 0,
        prepostosCadastrados: prepostosCount || 0,
        audienciasDesignadas: designadasCount || 0,
        totalAudiencias: totalCount || 0,
      });
    };

    fetchStats();

    const channel = supabase
      .channel("dashboard-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "audiencias" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "pessoas" }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const fetchAudiencias = async () => {
      const { data } = await supabase
        .from("audiencias")
        .select("carteira, data_audiencia, status")
        .gte("data_audiencia", inicio.toISOString().split("T")[0])
        .lte("data_audiencia", fim.toISOString().split("T")[0]);

      setAudiencias(data || []);
    };

    fetchAudiencias();
  }, [inicio, fim]);

  const carteiraSummary = useMemo(() => {
    const map: Record<string, { total: number; pendentes: number; atribuidas: number; concluidas: number }> = {};
    audiencias.forEach((a) => {
      const key = a.carteira || "Sem Carteira";
      if (!map[key]) map[key] = { total: 0, pendentes: 0, atribuidas: 0, concluidas: 0 };
      map[key].total++;
      if (a.status === "pendente") map[key].pendentes++;
      else if (a.status === "atribuida") map[key].atribuidas++;
      else if (a.status === "concluida") map[key].concluidas++;
    });
    return Object.entries(map)
      .map(([carteira, counts]) => ({ carteira, ...counts }))
      .sort((a, b) => b.total - a.total);
  }, [audiencias]);

  const filtroLabel = filtro === "dia" ? "Hoje" : filtro === "semana" ? "Esta Semana" : "Este Mês";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Bem-vindo ao sistema de gestão de audiências</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700 dark:text-amber-300 mb-1">Audiências esta Semana</p>
                <p className="text-4xl font-bold text-amber-900 dark:text-amber-100">{stats.audienciasEstaSemana}</p>
              </div>
              <div className="h-14 w-14 rounded-lg bg-amber-400 dark:bg-amber-600 flex items-center justify-center">
                <Calendar className="h-7 w-7 text-amber-900 dark:text-amber-100" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300 mb-1">Pendentes de Sorteio</p>
                <p className="text-4xl font-bold text-white">{stats.pendentesSorteio}</p>
              </div>
              <div className="h-14 w-14 rounded-lg bg-slate-950 dark:bg-slate-800 flex items-center justify-center">
                <Clock className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border-slate-300 dark:border-slate-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">Advogados Cadastrados</p>
                <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">{stats.advogadosCadastrados}</p>
              </div>
              <div className="h-14 w-14 rounded-lg bg-slate-300 dark:bg-slate-600 flex items-center justify-center">
                <Scale className="h-7 w-7 text-slate-900 dark:text-slate-100" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300 mb-1">Prepostos Cadastrados</p>
                <p className="text-4xl font-bold text-white">{stats.prepostosCadastrados}</p>
              </div>
              <div className="h-14 w-14 rounded-lg bg-slate-950 dark:bg-slate-800 flex items-center justify-center">
                <Users className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">Audiências por Carteira — {filtroLabel}</h2>
            <Tabs value={filtro} onValueChange={(v) => setFiltro(v as FilterPeriod)}>
              <TabsList>
                <TabsTrigger value="dia">Dia</TabsTrigger>
                <TabsTrigger value="semana">Semana</TabsTrigger>
                <TabsTrigger value="mes">Mês</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {carteiraSummary.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">Nenhuma audiência encontrada no período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Carteira</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Pendentes</TableHead>
                  <TableHead className="text-center">Atribuídas</TableHead>
                  <TableHead className="text-center">Concluídas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carteiraSummary.map((row) => (
                  <TableRow key={row.carteira}>
                    <TableCell className="font-medium">{row.carteira}</TableCell>
                    <TableCell className="text-center">{row.total}</TableCell>
                    <TableCell className="text-center">{row.pendentes}</TableCell>
                    <TableCell className="text-center">{row.atribuidas}</TableCell>
                    <TableCell className="text-center">{row.concluidas}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-center">{carteiraSummary.reduce((s, r) => s + r.total, 0)}</TableCell>
                  <TableCell className="text-center">{carteiraSummary.reduce((s, r) => s + r.pendentes, 0)}</TableCell>
                  <TableCell className="text-center">{carteiraSummary.reduce((s, r) => s + r.atribuidas, 0)}</TableCell>
                  <TableCell className="text-center">{carteiraSummary.reduce((s, r) => s + r.concluidas, 0)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Resumo da Semana</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-foreground">Audiências Designadas</span>
              <span className="text-primary font-semibold">{stats.audienciasDesignadas}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-foreground">Total de Audiências</span>
              <span className="font-semibold">{stats.totalAudiencias}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHome;
