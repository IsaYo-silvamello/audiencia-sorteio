import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Calendar, Clock, Users, ChevronLeft, ChevronRight, ChevronDown,
  Monitor, Video, Gavel, ShieldAlert, Link2, Building2, MapPin,
  CheckCircle2, AlertTriangle, Lock
} from "lucide-react";
import { startOfWeek, endOfWeek, addWeeks, format, isSameWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Audiencia {
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

interface PautaSemanal {
  id: string;
  semana_inicio: string;
  semana_fim: string;
  status: string;
  finalizada_em: string | null;
}

type Categoria = "concil_online" | "concil_presencial" | "aij_presencial" | "aij_online" | "super_endividamento" | "outros";

const CATEGORIAS: Record<Categoria, { label: string; icon: any; color: string; bgColor: string }> = {
  concil_online: { label: "Conciliatória Online", icon: Video, color: "text-blue-700 dark:text-blue-300", bgColor: "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800" },
  concil_presencial: { label: "Conciliatória Presencial", icon: Building2, color: "text-emerald-700 dark:text-emerald-300", bgColor: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800" },
  aij_presencial: { label: "AIJ Presencial", icon: Gavel, color: "text-orange-700 dark:text-orange-300", bgColor: "bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800" },
  aij_online: { label: "AIJ Online", icon: Monitor, color: "text-purple-700 dark:text-purple-300", bgColor: "bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800" },
  super_endividamento: { label: "Super Endividamento", icon: ShieldAlert, color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800" },
  outros: { label: "Outros", icon: Calendar, color: "text-muted-foreground", bgColor: "bg-muted/50 border-border" },
};

function isPresencial(aud: Audiencia): boolean {
  const tipo = (aud.tipo_audiencia || "").toLowerCase();
  const local = (aud.local || "").toLowerCase();
  if (tipo.includes("presencial") || local.includes("presencial")) return true;
  if (tipo.includes("online") || tipo.includes("virtual") || tipo.includes("vídeo") || tipo.includes("video") || local.includes("online") || local.includes("virtual")) return false;
  if (aud.link) return false;
  return true;
}

function categorizar(aud: Audiencia): Categoria {
  const tipo = (aud.tipo_audiencia || "").toLowerCase();
  if (tipo.includes("endividamento")) return "super_endividamento";
  const isConcilia = tipo.includes("concilia");
  const isAIJ = tipo.includes("instru") || tipo.includes("aij");
  const presencial = isPresencial(aud);
  if (isConcilia) return presencial ? "concil_presencial" : "concil_online";
  if (isAIJ) return presencial ? "aij_presencial" : "aij_online";
  return "outros";
}

type KpiFilter = "total" | "atribuidas" | "pendentes" | null;

export default function DashboardHome() {
  const [semanaAtual, setSemanaAtual] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [audiencias, setAudiencias] = useState<Audiencia[]>([]);
  const [pauta, setPauta] = useState<PautaSemanal | null>(null);
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});
  const [finalizando, setFinalizando] = useState(false);
  const [kpiModal, setKpiModal] = useState<KpiFilter>(null);

  const inicio = useMemo(() => semanaAtual, [semanaAtual]);
  const fim = useMemo(() => endOfWeek(semanaAtual, { weekStartsOn: 0 }), [semanaAtual]);

  const semanaLabel = useMemo(() => {
    const seg = new Date(inicio);
    seg.setDate(seg.getDate() + 1);
    const sex = new Date(fim);
    sex.setDate(sex.getDate() - 1);
    return `${format(seg, "dd/MM", { locale: ptBR })} à ${format(sex, "dd/MM/yyyy", { locale: ptBR })}`;
  }, [inicio, fim]);

  const isCurrentWeek = useMemo(() => isSameWeek(new Date(), semanaAtual, { weekStartsOn: 0 }), [semanaAtual]);

  const fetchData = useCallback(async () => {
    const inicioStr = format(inicio, "yyyy-MM-dd");
    const fimStr = format(fim, "yyyy-MM-dd");

    const [{ data: auds }, { data: pautaData }] = await Promise.all([
      supabase
        .from("audiencias")
        .select("id, autor, reu, data_audiencia, hora_audiencia, tipo_audiencia, local, foro, link, status, carteira, numero_processo, advogado, preposto, npc_dossie")
        .gte("data_audiencia", inicioStr)
        .lte("data_audiencia", fimStr),
      supabase
        .from("pautas_semanais")
        .select("*")
        .eq("semana_inicio", inicioStr)
        .maybeSingle(),
    ]);

    setAudiencias(auds || []);
    setPauta(pautaData);
  }, [inicio, fim]);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("dash-pauta")
      .on("postgres_changes", { event: "*", schema: "public", table: "audiencias" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "pautas_semanais" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const porCategoria = useMemo(() => {
    const map: Record<Categoria, Audiencia[]> = {
      concil_online: [], concil_presencial: [], aij_presencial: [], aij_online: [], super_endividamento: [], outros: [],
    };
    audiencias.forEach((a) => map[categorizar(a)].push(a));
    return map;
  }, [audiencias]);

  const alertas = useMemo(() => {
    const result: { label: string; count: number; icon: any }[] = [];
    const semAdvPrep = audiencias.filter((a) => !a.advogado && !a.preposto).length;
    if (semAdvPrep > 0) result.push({ label: "audiências sem advogado/preposto", count: semAdvPrep, icon: Users });
    const onlineSemLink = audiencias.filter((a) => !isPresencial(a) && !a.link).length;
    if (onlineSemLink > 0) result.push({ label: "audiências online sem link", count: onlineSemLink, icon: Link2 });
    const presencialSemForo = audiencias.filter((a) => isPresencial(a) && !a.foro).length;
    if (presencialSemForo > 0) result.push({ label: "audiências presenciais sem foro", count: presencialSemForo, icon: MapPin });
    return result;
  }, [audiencias]);

  const pautaConcluida = pauta?.status === "concluida";

  const handleFinalizar = async () => {
    if (alertas.length > 0) {
      toast.error("Existem pendências que impedem a finalização da pauta.", {
        description: alertas.map((a) => `${a.count} ${a.label}`).join(", "),
      });
      return;
    }
    if (audiencias.length === 0) {
      toast.error("Não há audiências nesta semana para finalizar.");
      return;
    }

    setFinalizando(true);
    const inicioStr = format(inicio, "yyyy-MM-dd");
    const fimStr = format(fim, "yyyy-MM-dd");

    if (pauta) {
      await supabase.from("pautas_semanais").update({ status: "concluida", finalizada_em: new Date().toISOString() }).eq("id", pauta.id);
    } else {
      await supabase.from("pautas_semanais").insert({ semana_inicio: inicioStr, semana_fim: fimStr, status: "concluida", finalizada_em: new Date().toISOString() });
    }
    toast.success("Pauta finalizada com sucesso!");
    setFinalizando(false);
    fetchData();
  };

  const handleReabrir = async () => {
    if (!pauta) return;
    await supabase.from("pautas_semanais").update({ status: "em_montagem", finalizada_em: null }).eq("id", pauta.id);
    toast.info("Pauta reaberta.");
    fetchData();
  };

  const totalPeriodo = audiencias.length;
  const atribuidasPeriodo = audiencias.filter((a) => a.advogado || a.preposto).length;
  const pendentesPeriodo = audiencias.filter((a) => !a.advogado && !a.preposto).length;

  const toggleCard = (key: string) => setOpenCards((prev) => ({ ...prev, [key]: !prev[key] }));

  // Filtered list for KPI modal
  const kpiAudiencias = useMemo(() => {
    if (kpiModal === "total") return audiencias;
    if (kpiModal === "atribuidas") return audiencias.filter((a) => a.advogado || a.preposto);
    if (kpiModal === "pendentes") return audiencias.filter((a) => !a.advogado && !a.preposto);
    return [];
  }, [kpiModal, audiencias]);

  const kpiTitle = kpiModal === "total" ? "Todas as Audiências" : kpiModal === "atribuidas" ? "Audiências Atribuídas" : "Audiências Pendentes";

  return (
    <div className="space-y-6">
      {/* Header + Week Selector */}
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Pauta de Audiências</h1>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setSemanaAtual((s) => addWeeks(s, -1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div
              className={`text-center px-6 py-3 rounded-xl border-2 transition-all ${
                isCurrentWeek
                  ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                  : "border-border bg-card"
              }`}
            >
              <p className={`text-xl font-bold ${isCurrentWeek ? "text-primary" : "text-foreground"}`}>
                {semanaLabel}
              </p>
              <div className="flex items-center justify-center gap-2 mt-1">
                {pautaConcluida ? (
                  <Badge className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Concluída
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-700 border-amber-300 dark:text-amber-300">
                    <Clock className="h-3 w-3 mr-1" /> Em montagem
                  </Badge>
                )}
                {isCurrentWeek && <Badge className="bg-primary/10 text-primary border-primary/30 text-xs">Semana atual</Badge>}
              </div>
            </div>

            <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setSemanaAtual((s) => addWeeks(s, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex gap-2">
            {!isCurrentWeek && (
              <Button variant="ghost" size="sm" onClick={() => setSemanaAtual(startOfWeek(new Date(), { weekStartsOn: 0 }))}>
                Ir para semana atual
              </Button>
            )}
            {pautaConcluida ? (
              <Button variant="outline" size="sm" onClick={handleReabrir}>
                <Lock className="h-4 w-4 mr-1" /> Reabrir Pauta
              </Button>
            ) : (
              <Button size="sm" onClick={handleFinalizar} disabled={finalizando}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {finalizando ? "Finalizando..." : "Finalizar Pauta"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alertas.length > 0 && !pautaConcluida && (
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

      {/* KPI Cards - clickable */}
      <div className="grid grid-cols-3 gap-4">
        {([
          { key: "total" as KpiFilter, label: "Total", value: totalPeriodo, icon: Calendar, color: "text-primary", bgIcon: "bg-blue-50 dark:bg-blue-950/50" },
          { key: "atribuidas" as KpiFilter, label: "Atribuídas", value: atribuidasPeriodo, icon: CheckCircle2, color: "text-green-600", bgIcon: "bg-green-50 dark:bg-green-950/50" },
          { key: "pendentes" as KpiFilter, label: "Pendentes", value: pendentesPeriodo, icon: AlertTriangle, color: pendentesPeriodo > 0 ? "text-amber-600" : "text-green-600", bgIcon: pendentesPeriodo > 0 ? "bg-amber-50 dark:bg-amber-950/50" : "bg-green-50 dark:bg-green-950/50" },
        ]).map(({ key, label, value, icon: Icon, color, bgIcon }) => (
          <Card
            key={key}
            className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/30"
            onClick={() => setKpiModal(key)}
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl ${bgIcon} flex items-center justify-center shrink-0`}>
                <Icon className={`h-6 w-6 ${color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPI Detail Modal */}
      <Dialog open={kpiModal !== null} onOpenChange={(open) => !open && setKpiModal(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{kpiTitle} — {semanaLabel}</DialogTitle>
          </DialogHeader>
          {kpiAudiencias.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma audiência encontrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Autor x Réu</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Advogado</TableHead>
                  <TableHead>Preposto</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpiAudiencias.map((aud) => (
                  <TableRow key={aud.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {aud.data_audiencia
                        ? format(new Date(aud.data_audiencia + "T00:00:00"), "dd/MM", { locale: ptBR })
                        : "—"}{" "}
                      {aud.hora_audiencia?.slice(0, 5) || ""}
                    </TableCell>
                    <TableCell className="text-sm font-medium max-w-[200px] truncate">
                      {aud.autor} x {aud.reu}
                    </TableCell>
                    <TableCell className="text-sm">{aud.tipo_audiencia || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {aud.advogado ? (
                        <span className="text-blue-700 dark:text-blue-300">{aud.advogado}</span>
                      ) : (
                        <span className="text-amber-600">⚠ Pendente</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {aud.preposto ? (
                        <span className="text-emerald-700 dark:text-emerald-300">{aud.preposto}</span>
                      ) : (
                        <span className="text-amber-600">⚠ Pendente</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={!aud.advogado && !aud.preposto ? "outline" : "default"} className="text-xs">
                        {aud.advogado || aud.preposto ? "Atribuída" : "Pendente"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Category Cards */}
      {totalPeriodo > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Object.entries(CATEGORIAS) as [Categoria, typeof CATEGORIAS[Categoria]][])
            .filter(([key]) => porCategoria[key].length > 0)
            .map(([key, cat]) => {
              const lista = porCategoria[key];
              const Icon = cat.icon;
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
                                <Badge variant={!aud.advogado && !aud.preposto ? "outline" : "default"} className="text-[10px] shrink-0">
                                  {aud.advogado || aud.preposto ? "atribuída" : "pendente"}
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
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nenhuma audiência nesta semana</p>
            <p className="text-sm mt-1">Importe os relatórios Seven e eLaw na aba Importação</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
