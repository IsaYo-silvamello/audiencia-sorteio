import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Scale, Users } from "lucide-react";
import { startOfWeek, endOfWeek } from "date-fns";

const DashboardHome = () => {
  const [stats, setStats] = useState({
    audienciasEstaSemana: 0,
    pendentesSorteio: 0,
    advogadosCadastrados: 0,
    prepostosCadastrados: 0,
    audienciasDesignadas: 0,
    totalAudiencias: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const hoje = new Date();
      const inicioSemana = startOfWeek(hoje, { weekStartsOn: 0 });
      const fimSemana = endOfWeek(hoje, { weekStartsOn: 0 });

      // Audiências desta semana
      const { count: audienciasCount } = await supabase
        .from("audiencias")
        .select("*", { count: "exact", head: true })
        .gte("data_audiencia", inicioSemana.toISOString())
        .lte("data_audiencia", fimSemana.toISOString());

      // Pendentes de sorteio
      const { count: pendentesCount } = await supabase
        .from("audiencias")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente");

      // Advogados cadastrados
      const { count: advogadosCount } = await supabase
        .from("pessoas")
        .select("*", { count: "exact", head: true })
        .eq("tipo", "advogado")
        .eq("ativo", true);

      // Prepostos cadastrados
      const { count: prepostosCount } = await supabase
        .from("pessoas")
        .select("*", { count: "exact", head: true })
        .eq("tipo", "preposto")
        .eq("ativo", true);

      // Audiências designadas
      const { count: designadasCount } = await supabase
        .from("audiencias")
        .select("*", { count: "exact", head: true })
        .eq("status", "atribuida");

      // Total de audiências
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "audiencias" },
        fetchStats
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pessoas" },
        fetchStats
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
