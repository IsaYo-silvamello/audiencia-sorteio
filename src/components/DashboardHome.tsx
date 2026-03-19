// src/components/DashboardHome.tsx  ← substitui o arquivo atual

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, Scale, Users, AlertTriangle, TrendingUp } from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, format, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";

type FilterPeriod = "dia" | "semana" | "mes";

interface Pessoa {
  id: string;
  nome: string;
  tipo: string;
  total: number;
  semana: number;
}

export default function DashboardHome() {
  const [stats, setStats] = useState({
    audienciasEstaSemana: 0,
    pendentesSorteio: 0,
    advogadosCadastrados: 0,
    prepostosCadastrados: 0,
    totalAudiencias: 0,
    realizadas: 0,
  });
  const [audiencias, setAudiencias] = useState<any[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [alertas, setAlertas] = useState<string[]>([]);
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
    const fetchAll = async () => {
      const hoje = new Date();
      const iS = startOfWeek(hoje, { weekStartsOn: 0 });
      const fS = endOfWeek(hoje, { weekStartsOn: 0 });

      const [
        { count: semana },
        { count: pendentes },
        { count: adv },
        { count: prep },
        { count: total },
        { count: realizadas },
      ] = await Promise.all([
        supabase
          .from("audiencias")
          .select("*", { count: "exact", head: true })
          .gte("data_audiencia", iS.toISOString().split("T")[0])
          .lte("data_audiencia", fS.toISOString().split("T")[0]),
        supabase.from("audiencias").select("*", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("pessoas").select("*", { count: "exact", head: true }).eq("tipo", "advogado").eq("ativo", true),
        supabase.from("pessoas").select("*", { count: "exact", head: true }).eq("tipo", "preposto").eq("ativo", true),
        supabase.from("audiencias").select("*", { count: "exact", head: true }),
        supabase.from("audiencias").select("*", { count: "exact", head: true }).eq("status", "realizada"),
      ]);

      setStats({
        audienciasEstaSemana: semana || 0,
        pendentesSorteio: pendentes || 0,
        advogadosCadastrados: adv || 0,
        prepostosCadastrados: prep || 0,
        totalAudiencias: total || 0,
        realizadas: realizadas || 0,
      });

      // Alertas inteligentes
      const novosAlertas: string[] = [];
      if ((pendentes || 0) > 5) novosAlertas.push(`${pendentes} audiências pendentes de sorteio`);

      const amanha = new Date(hoje);
      amanha.setDate(hoje.getDate() + 1);
      const { count: proximasSemSortear } = await supabase
        .from("audiencias")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente")
        .lte("data_audiencia", amanha.toISOString().split("T")[0]);
      if ((proximasSemSortear || 0) > 0) {
        novosAlertas.push(`${proximasSemSortear} audiência(s) pendentes com data amanhã ou antes`);
      }

      setAlertas(novosAlertas);

      // Ranking de pessoas
      const { data: atrSemana } = await supabase
        .from("atribuicoes")
        .select("pessoa_id, pessoas(nome, tipo)")
        .gte("semana_inicio", iS.toISOString().split("T")[0]);

      const { data: atrTotal } = await supabase.from("atribuicoes").select("pessoa_id");

      const contagemSemana = new Map<string, number>();
      const contagemTotal = new Map<string, number>();
      const nomesMap = new Map<string, { nome: string; tipo: string }>();

      (atrSemana || []).forEach((a: any) => {
        contagemSemana.set(a.pessoa_id, (contagemSemana.get(a.pessoa_id) || 0) + 1);
        if (a.pessoas) nomesMap.set(a.pessoa_id, a.pessoas);
      });
      (atrTotal || []).forEach((a: any) => {
        contagemTotal.set(a.pessoa_id, (contagemTotal.get(a.pessoa_id) || 0) + 1);
      });

      const ranking: Pessoa[] = Array.from(nomesMap.entries())
        .map(([id, info]) => ({
          id,
          nome: info.nome,
          tipo: info.tipo,
          semana: contagemSemana.get(id) || 0,
          total: contagemTotal.get(id) || 0,
        }))
        .sort((a, b) => b.total - a.total);

      setPessoas(ranking);
    };

    fetchAll();

    const channel = supabase
      .channel("dash")
      .on("postgres_changes", { event: "*", schema: "public", table: "audiencias" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "atribuicoes" }, fetchAll)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("audiencias")
        .select("carteira, data_audiencia, status")
        .gte("data_audiencia", inicio.toISOString().split("T")[0])
        .lte("data_audiencia", fim.toISOString().split("T")[0]);
      setAudiencias(data || []);
    };
    fetch();
  }, [inicio, fim]);

  const carteiraSummary = useMemo(() => {
    const map: Record<string, { total: number; pendentes: number; atribuidas: number; realizadas: number }> = {};
    audiencias.forEach((a) => {
      const key = a.carteira || "Sem Carteira";
      if (!map[key]) map[key] = { total: 0, pendentes: 0, atribuidas: 0, realizadas: 0 };
      map[key].total++;
      if (a.status === "pendente") map[key].pendentes++;
      else if (a.status === "atribuida") map[key].atribuidas++;
      else if (a.status === "realizada") map[key].realizadas++;
    });
    return Object.entries(map)
      .map(([carteira, c]) => ({ carteira, ...c }))
      .sort((a, b) => b.total - a.total);
  }, [audiencias]);

  const taxaRealizacao = stats.totalAudiencias > 0 ? Math.round((stats.realizadas / stats.totalAudiencias) * 100) : 0;

  const filtroLabel = filtro === "dia" ? "Hoje" : filtro === "semana" ? "Esta semana" : "Este mês";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
        <p className="text-muted-foreground">Gestão de audiências — visão geral</p>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((a, i) => (
            <Alert key={i} className="border-amber-400 bg-amber-50 dark:bg-amber-950">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">{a}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Esta semana", value: stats.audienciasEstaSemana, icon: Calendar, color: "text-primary" },
          {
            label: "Pendentes",
            value: stats.pendentesSorteio,
            icon: Clock,
            color: stats.pendentesSorteio > 0 ? "text-amber-600" : "text-green-600",
          },
          { label: "Advogados", value: stats.advogadosCadastrados, icon: Scale, color: "text-foreground" },
          { label: "Prepostos", value: stats.prepostosCadastrados, icon: Users, color: "text-foreground" },
          { label: "Total geral", value: stats.totalAudiencias, icon: TrendingUp, color: "text-foreground" },
          {
            label: "Taxa realização",
            value: `${taxaRealizacao}%`,
            icon: TrendingUp,
            color: taxaRealizacao > 70 ? "text-green-600" : "text-amber-600",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Audiências por carteira */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">Audiências por carteira — {filtroLabel}</CardTitle>
            <Tabs value={filtro} onValueChange={(v) => setFiltro(v as FilterPeriod)}>
              <TabsList>
                <TabsTrigger value="dia">Hoje</TabsTrigger>
                <TabsTrigger value="semana">Semana</TabsTrigger>
                <TabsTrigger value="mes">Mês</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {carteiraSummary.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma audiência no período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Carteira</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Pendentes</TableHead>
                  <TableHead className="text-center">Atribuídas</TableHead>
                  <TableHead className="text-center">Realizadas</TableHead>
                  <TableHead className="text-center">Progresso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carteiraSummary.map((row) => {
                  const pct = row.total > 0 ? Math.round((row.realizadas / row.total) * 100) : 0;
                  return (
                    <TableRow key={row.carteira}>
                      <TableCell className="font-medium">{row.carteira}</TableCell>
                      <TableCell className="text-center">{row.total}</TableCell>
                      <TableCell className="text-center">
                        {row.pendentes > 0 ? (
                          <Badge variant="outline" className="text-amber-700 border-amber-400">
                            {row.pendentes}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-center">{row.atribuidas}</TableCell>
                      <TableCell className="text-center">{row.realizadas}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Ranking de pessoas — balanceamento de carga */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Balanceamento de carga — esta semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pessoas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atribuição esta semana.</p>
          ) : (
            <div className="space-y-2">
              {pessoas.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <Badge
                    variant={p.tipo === "advogado" ? "default" : "secondary"}
                    className="w-20 justify-center text-xs shrink-0"
                  >
                    {p.tipo === "advogado" ? "Advogado" : "Preposto"}
                  </Badge>
                  <span className="text-sm flex-1 truncate">{p.nome}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-20 bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${p.semana >= 2 ? "bg-red-500" : p.semana === 1 ? "bg-amber-500" : "bg-green-500"}`}
                        style={{ width: `${Math.min(p.semana * 50, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-12 text-right">{p.semana}/2 sem.</span>
                    <span className="text-xs text-muted-foreground w-14 text-right">{p.total} total</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
