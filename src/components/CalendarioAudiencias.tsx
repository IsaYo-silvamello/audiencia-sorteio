import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, ChevronDown, Monitor, MapPin, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Audiencia {
  id: string;
  autor: string;
  reu: string;
  numero_processo: string | null;
  data_audiencia: string | null;
  hora_audiencia: string | null;
  status: string;
  carteira: string | null;
  tipo_audiencia: string | null;
  advogado: string | null;
  preposto: string | null;
  local: string | null;
  foro: string | null;
  comarca: string | null;
  adv_responsavel: string | null;
}

const statusColor: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800 border-yellow-300",
  atribuida: "bg-green-100 text-green-800 border-green-300",
  concluida: "bg-blue-100 text-blue-800 border-blue-300",
  presencial: "bg-orange-100 text-orange-800 border-orange-300",
};

function isPresencial(a: Audiencia): boolean {
  const tipo = (a.tipo_audiencia || "").toLowerCase();
  const local = (a.local || "").toLowerCase();
  return tipo.includes("presencial") || local.includes("presencial");
}

function getResponsavel(a: Audiencia): string {
  return a.adv_responsavel || a.advogado || a.preposto || "Sem responsável";
}

function formatWeekHeader(inicio: Date, fim: Date): string {
  const diaInicio = format(inicio, "d");
  const diaFim = format(fim, "d");
  const mesInicio = format(inicio, "MMMM", { locale: ptBR });
  const mesFim = format(fim, "MMMM", { locale: ptBR });
  const ano = format(fim, "yyyy");

  if (mesInicio === mesFim) {
    return `Semana de ${diaInicio} a ${diaFim} de ${mesInicio} de ${ano}`;
  }
  return `Semana de ${diaInicio} de ${mesInicio} a ${diaFim} de ${mesFim} de ${ano}`;
}

function getCargaLevel(count: number): { bg: string; border: string; label: string } {
  if (count === 0) return { bg: "bg-muted/30", border: "border-border/50", label: "" };
  if (count <= 3) return { bg: "bg-green-50", border: "border-green-200", label: "leve" };
  if (count <= 6) return { bg: "bg-yellow-50", border: "border-yellow-200", label: "moderada" };
  if (count <= 10) return { bg: "bg-orange-50", border: "border-orange-200", label: "alta" };
  return { bg: "bg-red-50", border: "border-red-200", label: "crítica" };
}

const CalendarioAudiencias = () => {
  const [audiencias, setAudiencias] = useState<Audiencia[]>([]);
  const [semanaRef, setSemanaRef] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const handleSelectDay = useCallback((key: string) => {
    const isAlreadySelected = selectedDay === key;
    setSelectedDay(isAlreadySelected ? null : key);
    if (!isAlreadySelected) {
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [selectedDay]);

  useEffect(() => {
    const fetchAudiencias = async () => {
      const { data } = await supabase
        .from("audiencias")
        .select("id, autor, reu, numero_processo, data_audiencia, hora_audiencia, status, carteira, tipo_audiencia, advogado, preposto, local, foro, comarca, adv_responsavel")
        .not("data_audiencia", "is", null);
      if (data) setAudiencias(data);
    };
    fetchAudiencias();
  }, []);

  const inicio = startOfWeek(semanaRef, { weekStartsOn: 0 });
  const fim = endOfWeek(semanaRef, { weekStartsOn: 0 });
  const dias = eachDayOfInterval({ start: inicio, end: fim });

  const audienciasPorDia = useMemo(() => {
    const map: Record<string, Audiencia[]> = {};
    dias.forEach((d) => {
      const key = format(d, "yyyy-MM-dd");
      map[key] = audiencias.filter((a) => {
        if (!a.data_audiencia) return false;
        try { return isSameDay(parseISO(a.data_audiencia), d); } catch { return false; }
      });
    });
    return map;
  }, [audiencias, dias]);

  const weekTotal = useMemo(() => {
    return Object.values(audienciasPorDia).reduce((sum, arr) => sum + arr.length, 0);
  }, [audienciasPorDia]);

  const selectedDayAuds = selectedDay ? (audienciasPorDia[selectedDay] || []) : [];

  const responsaveisDoDia = useMemo(() => {
    if (!selectedDay) return [];
    const map: Record<string, number> = {};
    selectedDayAuds.forEach((a) => {
      const r = getResponsavel(a);
      map[r] = (map[r] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [selectedDay, selectedDayAuds]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-foreground">Calendário de Audiências</h2>
          <p className="text-sm text-muted-foreground">
            {formatWeekHeader(inicio, fim)} · <span className="font-semibold text-foreground">{weekTotal}</span> audiências
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSemanaRef(subWeeks(semanaRef, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSemanaRef(new Date())}>Hoje</Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSemanaRef(addWeeks(semanaRef, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {dias.map((dia) => {
          const key = format(dia, "yyyy-MM-dd");
          const auds = audienciasPorDia[key] || [];
          const isToday = isSameDay(dia, new Date());
          const isSelected = selectedDay === key;
          const carga = getCargaLevel(auds.length);
          const virtuais = auds.filter((a) => !isPresencial(a)).length;
          const presenciais = auds.filter((a) => isPresencial(a)).length;

          // Responsáveis resumo (top 2)
          const respMap: Record<string, number> = {};
          auds.forEach((a) => {
            const r = getResponsavel(a);
            const nome = r.split(" ")[0]; // primeiro nome
            respMap[nome] = (respMap[nome] || 0) + 1;
          });
          const topResp = Object.entries(respMap).sort((a, b) => b[1] - a[1]).slice(0, 2);

          return (
            <button
              key={key}
              onClick={() => handleSelectDay(key)}
              className={`
                text-left rounded-lg border transition-all duration-200 min-h-[140px] p-2.5 flex flex-col gap-1.5
                hover:shadow-md hover:scale-[1.01] cursor-pointer
                ${isSelected ? "ring-2 ring-primary shadow-md bg-primary/5 border-primary" : ""}
                ${isToday && !isSelected ? "ring-1 ring-primary/50 bg-primary/[0.03]" : ""}
                ${!isSelected && !isToday ? `${carga.bg} ${carga.border}` : ""}
              `}
            >
              {/* Day header */}
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold capitalize ${isToday ? "text-primary" : "text-foreground"}`}>
                  {format(dia, "EEE", { locale: ptBR })}
                </span>
                <span className={`text-lg font-bold leading-none ${isToday ? "text-primary" : "text-foreground"}`}>
                  {format(dia, "dd")}
                </span>
              </div>

              {auds.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground/60 italic">Sem audiências</span>
                </div>
              ) : (
                <>
                  {/* Count badge */}
                  <div className="flex items-center gap-1">
                    <span className={`text-2xl font-bold ${
                      carga.label === "crítica" ? "text-red-600" :
                      carga.label === "alta" ? "text-orange-600" :
                      carga.label === "moderada" ? "text-yellow-700" :
                      "text-green-700"
                    }`}>
                      {auds.length}
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      audiência{auds.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Virtual / Presencial split */}
                  <div className="flex gap-1.5 text-[10px]">
                    {virtuais > 0 && (
                      <span className="flex items-center gap-0.5 text-blue-600">
                        <Monitor className="h-3 w-3" />{virtuais}
                      </span>
                    )}
                    {presenciais > 0 && (
                      <span className="flex items-center gap-0.5 text-orange-600">
                        <MapPin className="h-3 w-3" />{presenciais}
                      </span>
                    )}
                  </div>

                  {/* Top responsáveis */}
                  {topResp.length > 0 && (
                    <div className="mt-auto space-y-0.5">
                      {topResp.map(([nome, count]) => (
                        <div key={nome} className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="truncate max-w-[60px]">{nome}</span>
                          <span className="font-medium text-foreground">{count}</span>
                        </div>
                      ))}
                      {Object.keys(respMap).length > 2 && (
                        <span className="text-[9px] text-muted-foreground/70">+{Object.keys(respMap).length - 2} outros</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Floating scroll button */}
      {selectedDay && selectedDayAuds.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            className="animate-bounce shadow-md"
            onClick={() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            <ChevronDown className="h-4 w-4 mr-1" />
            Ver {selectedDayAuds.length} audiência{selectedDayAuds.length > 1 ? "s" : ""} do dia
          </Button>
        </div>
      )}

      {/* Selected Day Detail Panel */}
      {selectedDay && selectedDayAuds.length > 0 && (
        <div ref={detailRef}>
          <Card className="border-primary/20">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">
                    {format(parseISO(selectedDay), "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedDayAuds.length} audiência{selectedDayAuds.length > 1 ? "s" : ""} ·{" "}
                    {selectedDayAuds.filter((a) => !isPresencial(a)).length} virtuais ·{" "}
                    {selectedDayAuds.filter((a) => isPresencial(a)).length} presenciais
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)}>Fechar</Button>
              </div>

              {responsaveisDoDia.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <Users className="h-3 w-3" /> Distribuição por Responsável
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {responsaveisDoDia.map(([nome, count]) => (
                      <Badge key={nome} variant="secondary" className="text-xs">
                        {nome.split(" ").slice(0, 2).join(" ")} <span className="ml-1 font-bold">{count}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="max-h-[60vh] overflow-y-auto pr-2">
                <div className="space-y-2">
                  {selectedDayAuds
                    .sort((a, b) => (a.hora_audiencia || "").localeCompare(b.hora_audiencia || ""))
                    .map((a) => (
                      <div key={a.id} className="flex items-start gap-3 p-3 rounded-md border bg-card hover:bg-accent/30 transition-colors">
                        <div className="text-sm font-mono font-semibold text-primary min-w-[50px]">
                          {a.hora_audiencia || "—"}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-medium truncate">{a.autor} × {a.reu}</p>
                          <div className="flex flex-wrap gap-1.5 text-[11px]">
                            <Badge variant="outline" className={`${statusColor[a.status] || ""} text-[10px]`}>
                              {a.status}
                            </Badge>
                            {a.tipo_audiencia && (
                              <Badge variant="outline" className="text-[10px]">{a.tipo_audiencia}</Badge>
                            )}
                            {isPresencial(a) ? (
                              <span className="flex items-center gap-0.5 text-orange-600"><MapPin className="h-3 w-3" />Presencial</span>
                            ) : (
                              <span className="flex items-center gap-0.5 text-blue-600"><Monitor className="h-3 w-3" />Virtual</span>
                            )}
                          </div>
                          {a.numero_processo && (
                            <p className="text-[11px] text-muted-foreground truncate">{a.numero_processo}</p>
                          )}
                        </div>
                        <div className="text-right text-[11px] text-muted-foreground space-y-0.5">
                          <p className="truncate max-w-[120px]">{getResponsavel(a)}</p>
                          {a.carteira && <p className="truncate max-w-[120px]">{a.carteira}</p>}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CalendarioAudiencias;
