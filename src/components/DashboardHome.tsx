import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Calendar, Clock, Scale, Users, AlertTriangle, TrendingUp,
  Upload, Shuffle, CheckCircle2, ChevronDown, Monitor, MapPin,
  Video, Gavel, ShieldAlert, FileWarning, Link2, Building2
} from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, format } from "date-fns";
import { ptBR } from "date-fns/locale";

type FilterPeriod = "dia" | "semana" | "mes";

interface AudienciaComAtribuicao {
  id: string;
  autor: string;
  reu: string;
  data_audiencia: string | null;
  hora_audiencia: string | null;
  tipo_audiencia: string | null;
  local: string | null;
  foro: string | null;
  link: string | null;
  status: string;
  carteira: string | null;
  numero_processo: string | null;
  advogado: string | null;
  preposto: string | null;
  npc_dossie: string | null;
}

type Categoria = "concil_online" | "concil_presencial" | "aij_presencial" | "aij_online" | "super_endividamento" | "outros";

const CATEGORIAS: Record<Categoria, { label: string; icon: any; color: string; bgColor: string }> = {
  concil_online: { label: "Conciliatória Online", icon: Video, color: "text-blue-700 dark:text-blue-300", bgColor: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" },
  concil_presencial: { label: "Conciliatória Presencial", icon: Building2, color: "text-emerald-700 dark:text-emerald-300", bgColor: "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800" },
  aij_presencial: { label: "AIJ Presencial", icon: Gavel, color: "text-orange-700 dark:text-orange-300", bgColor: "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800" },
  aij_online: { label: "AIJ Online", icon: Monitor, color: "text-purple-700 dark:text-purple-300", bgColor: "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800" },
  super_endividamento: { label: "Super Endividamento", icon: ShieldAlert, color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800" },
  outros: { label: "Outros", icon: Calendar, color: "text-muted-foreground", bgColor: "bg-muted/50 border-border" },
};

function isPresencial(aud: AudienciaComAtribuicao): boolean {
  const tipo = (aud.tipo_audiencia || "").toLowerCase();
  const local = (aud.local || "").toLowerCase();
  if (tipo.includes("presencial") || local.includes("presencial")) return true;
  if (tipo.includes("online") || tipo.includes("virtual") || tipo.includes("vídeo") || tipo.includes("video") || local.includes("online") || local.includes("virtual")) return false;
  if (aud.link) return false;
  return true;
}

function categorizar(aud: AudienciaComAtribuicao): Categoria {
  const tipo = (aud.tipo_audiencia || "").toLowerCase();
  if (tipo.includes("endividamento")) return "super_endividamento";
  const isConcilia = tipo.includes("concilia");
  const isAIJ = tipo.includes("instru") || tipo.includes("aij");
  const presencial = isPresencial(aud);
  if (isConcilia) return presencial ? "concil_presencial" : "concil_online";
  if (isAIJ) return presencial ? "aij_presencial" : "aij_online";
  return "outros";
}

export default function DashboardHome() {
  const [audiencias, setAudiencias] = useState<AudienciaComAtribuicao[]>([]);
  const [totalAudiencias, setTotalAudiencias] = useState(0);
  const [totalAtribuicoes, setTotalAtribuicoes] = useState(0);
  const [filtro, setFiltro] = useState<FilterPeriod>("semana");
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});

  const { inicio, fim } = useMemo(() => {
    const hoje = new Date();
    switch (filtro) {
      case "dia": return { inicio: startOfDay(hoje), fim: endOfDay(hoje) };
      case "semana": return { inicio: startOfWeek(hoje, { weekStartsOn: 0 }), fim: endOfWeek(hoje, { weekStartsOn: 0 }) };
      case "mes": return { inicio: startOfMonth(hoje), fim: endOfMonth(hoje) };
    }
  }, [filtro]);

  useEffect(() => {
    const fetchData = async () => {
      const { data, count } = await supabase
        .from("audiencias")
        .select("id, autor, reu, data_audiencia, hora_audiencia, tipo_audiencia, local, foro, link, status, carteira, numero_processo, advogado, preposto, npc_dossie", { count: "exact" })
        .gte("data_audiencia", inicio.toISOString().split("T")[0])
        .lte("data_audiencia", fim.toISOString().split("T")[0]);

      setAudiencias(data || []);

      const { count: totalC } = await supabase.from("audiencias").select("*", { count: "exact", head: true });
      setTotalAudiencias(totalC || 0);

      const { count: atribC } = await supabase.from("atribuicoes").select("*", { count: "exact", head: true });
      setTotalAtribuicoes(atribC || 0);
    };
    fetchData();

    const channel = supabase
      .channel("dash-redesign")
      .on("postgres_changes", { event: "*", schema: "public", table: "audiencias" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "atribuicoes" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [inicio, fim]);

  // Stepper status
  const step1Done = totalAudiencias > 0;
  const step2Done = totalAtribuicoes > 0;

  // Categorize
  const porCategoria = useMemo(() => {
    const map: Record<Categoria, AudienciaComAtribuicao[]> = {
      concil_online: [], concil_presencial: [], aij_presencial: [], aij_online: [], super_endividamento: [], outros: [],
    };
    audiencias.forEach((a) => { map[categorizar(a)].push(a); });
    return map;
  }, [audiencias]);

  // Alerts
  const alertas = useMemo(() => {
    const result: { label: string; count: number; icon: any }[] = [];
    const semAdvPrep = audiencias.filter((a) => !a.advogado && !a.preposto).length;
    if (semAdvPrep > 0) result.push({ label: "audiências sem advogado/preposto atribuído", count: semAdvPrep, icon: Users });

    const onlineSemLink = audiencias.filter((a) => !isPresencial(a) && !a.link).length;
    if (onlineSemLink > 0) result.push({ label: "audiências online sem link", count: onlineSemLink, icon: Link2 });

    const presencialSemForo = audiencias.filter((a) => isPresencial(a) && !a.foro).length;
    if (presencialSemForo > 0) result.push({ label: "audiências presenciais sem foro/endereço", count: presencialSemForo, icon: MapPin });

    const pendentes = audiencias.filter((a) => a.status === "pendente").length;
    if (pendentes > 0) result.push({ label: "audiências pendentes de sorteio", count: pendentes, icon: Clock });

    return result;
  }, [audiencias]);

  const step3Done = alertas.length === 0 && audiencias.length > 0;

  const filtroLabel = filtro === "dia" ? "Hoje" : filtro === "semana" ? "Esta semana" : "Este mês";
  const totalPeriodo = audiencias.length;
  const atribuidasPeriodo = audiencias.filter((a) => a.status === "atribuida" || a.advogado || a.preposto).length;
  const realizadasPeriodo = audiencias.filter((a) => a.status === "realizada").length;
  const pendentesPeriodo = audiencias.filter((a) => a.status === "pendente").length;

  const toggleCard = (key: string) => setOpenCards((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Central de Operações</h1>
          <p className="text-sm text-muted-foreground">Gerencie o fluxo completo de audiências</p>
        </div>
        <Tabs value={filtro} onValueChange={(v) => setFiltro(v as FilterPeriod)}>
          <TabsList>
            <TabsTrigger value="dia">Hoje</TabsTrigger>
            <TabsTrigger value="semana">Semana</TabsTrigger>
            <TabsTrigger value="mes">Mês</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── STEPPER ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { step: 1, label: "Importar Relatórios", desc: "Suba os relatórios Seven e eLaw", icon: Upload, done: step1Done },
          { step: 2, label: "Sortear Responsáveis", desc: "Atribua advogados e prepostos", icon: Shuffle, done: step2Done },
          { step: 3, label: "Revisar Pendências", desc: "Verifique informações faltantes", icon: CheckCircle2, done: step3Done },
        ].map(({ step, label, desc, icon: Icon, done }) => (
          <Card key={step} className={`transition-all ${done ? "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/30" : "border-border"}`}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`rounded-full h-10 w-10 flex items-center justify-center shrink-0 ${done ? "bg-green-100 dark:bg-green-900" : "bg-muted"}`}>
                {done ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Icon className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div>
                <p className="text-sm font-semibold flex items-center gap-2">
                  <span className="text-muted-foreground">#{step}</span>
                  {label}
                  {done && <Badge variant="outline" className="text-green-700 border-green-400 text-[10px] px-1.5">OK</Badge>}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── ALERTAS ── */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((a, i) => (
            <Alert key={i} className="border-amber-300 bg-amber-50 dark:bg-amber-950/50">
              <a.icon className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200 font-medium">
                <span className="font-bold">{a.count}</span> {a.label}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* ── KPIs COMPACTOS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: `Total (${filtroLabel.toLowerCase()})`, value: totalPeriodo, icon: Calendar, color: "text-primary" },
          { label: "Pendentes", value: pendentesPeriodo, icon: Clock, color: pendentesPeriodo > 0 ? "text-amber-600" : "text-green-600" },
          { label: "Atribuídas", value: atribuidasPeriodo, icon: Users, color: "text-blue-600" },
          { label: "Realizadas", value: realizadasPeriodo, icon: CheckCircle2, color: "text-green-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-3 flex items-center gap-3">
              <Icon className={`h-5 w-5 ${color} shrink-0`} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── CAIXAS ORGANIZADORAS ── */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Scale className="h-5 w-5" />
          Audiências por Tipo — {filtroLabel}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Object.entries(CATEGORIAS) as [Categoria, typeof CATEGORIAS[Categoria]][])
            .filter(([key]) => porCategoria[key].length > 0 || key !== "outros")
            .map(([key, cat]) => {
              const lista = porCategoria[key];
              const Icon = cat.icon;
              if (lista.length === 0 && key === "outros") return null;
              return (
                <Collapsible key={key} open={openCards[key]} onOpenChange={() => toggleCard(key)}>
                  <Card className={`border ${cat.bgColor} transition-all`}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="p-4 cursor-pointer hover:opacity-80">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-5 w-5 ${cat.color}`} />
                            <CardTitle className={`text-sm font-semibold ${cat.color}`}>{cat.label}</CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-lg font-bold px-3">{lista.length}</Badge>
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openCards[key] ? "rotate-180" : ""}`} />
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="px-4 pb-4 pt-0">
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {lista.map((aud) => (
                            <div key={aud.id} className="text-xs bg-background/80 rounded-md p-2.5 border border-border/50 space-y-1">
                              <div className="flex justify-between items-start gap-2">
                                <span className="font-medium truncate flex-1">{aud.autor} x {aud.reu}</span>
                                <Badge variant={aud.status === "pendente" ? "outline" : aud.status === "atribuida" ? "default" : "secondary"} className="text-[10px] shrink-0">
                                  {aud.status}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                                {aud.data_audiencia && (
                                  <span>{format(new Date(aud.data_audiencia + "T00:00:00"), "dd/MM", { locale: ptBR })} {aud.hora_audiencia?.slice(0, 5) || ""}</span>
                                )}
                                {aud.numero_processo && <span>Proc: {aud.numero_processo.slice(-8)}</span>}
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                                {aud.advogado ? (
                                  <span className="text-blue-700 dark:text-blue-300">Adv: {aud.advogado}</span>
                                ) : (
                                  <span className="text-amber-600">⚠ Sem advogado</span>
                                )}
                                {aud.preposto ? (
                                  <span className="text-emerald-700 dark:text-emerald-300">Prep: {aud.preposto}</span>
                                ) : (
                                  <span className="text-amber-600">⚠ Sem preposto</span>
                                )}
                              </div>
                              {!isPresencial(aud) && !aud.link && (
                                <span className="text-red-500 flex items-center gap-1"><Link2 className="h-3 w-3" /> Sem link</span>
                              )}
                              {isPresencial(aud) && !aud.foro && (
                                <span className="text-red-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> Sem foro</span>
                              )}
                            </div>
                          ))}
                          {lista.length === 0 && (
                            <p className="text-center text-muted-foreground py-3">Nenhuma audiência nesta categoria.</p>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
        </div>
      </div>
    </div>
  );
}
