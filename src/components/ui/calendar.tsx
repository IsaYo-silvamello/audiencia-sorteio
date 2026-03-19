// src/components/CalendarioAudiencias.tsx
// Calendário semanal com cores por status e navegação entre semanas

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Audiencia {
  id: string;
  numero_processo: string;
  data_audiencia: string;
  hora_audiencia: string;
  status: string;
  carteira: string | null;
  autor: string;
  reu: string;
  tipo_audiencia: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-amber-100 border-amber-400 text-amber-900",
  atribuida: "bg-blue-100 border-blue-400 text-blue-900",
  realizada: "bg-green-100 border-green-400 text-green-900",
  nao_realizada: "bg-red-100 border-red-400 text-red-900",
};

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  atribuida: "Atribuída",
  realizada: "Realizada",
  nao_realizada: "Não realizada",
};

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function CalendarioAudiencias() {
  const [semanaBase, setSemanaBase] = useState(new Date());
  const [audiencias, setAudiencias] = useState<Audiencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionada, setSelecionada] = useState<Audiencia | null>(null);

  const inicio = useMemo(() => startOfWeek(semanaBase, { weekStartsOn: 0 }), [semanaBase]);
  const fim = useMemo(() => endOfWeek(semanaBase, { weekStartsOn: 0 }), [semanaBase]);
  const dias = useMemo(() => eachDayOfInterval({ start: inicio, end: fim }), [inicio, fim]);

  useEffect(() => {
    const fetchAudiencias = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("audiencias")
        .select("id, numero_processo, data_audiencia, hora_audiencia, status, carteira, autor, reu, tipo_audiencia")
        .gte("data_audiencia", format(inicio, "yyyy-MM-dd"))
        .lte("data_audiencia", format(fim, "yyyy-MM-dd"))
        .order("hora_audiencia");
      setAudiencias(data || []);
      setLoading(false);
    };
    fetchAudiencias();
  }, [inicio, fim]);

  const audienciasDoDia = (dia: Date) =>
    audiencias.filter((a) => isSameDay(new Date(a.data_audiencia + "T00:00:00"), dia));

  const hoje = new Date();
  const isHoje = (dia: Date) => isSameDay(dia, hoje);

  return (
    <div className="space-y-4">
      {/* Navegação */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Calendário de Audiências</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setSemanaBase(subWeeks(semanaBase, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setSemanaBase(new Date())}>
            Hoje
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            {format(inicio, "d MMM", { locale: ptBR })} — {format(fim, "d MMM yyyy", { locale: ptBR })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setSemanaBase(addWeeks(semanaBase, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(STATUS_LABEL).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm border ${STATUS_COLORS[key]}`} />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Grid semanal */}
      <div className="grid grid-cols-7 gap-2">
        {dias.map((dia, idx) => (
          <div key={idx} className="min-h-[120px]">
            {/* Cabeçalho do dia */}
            <div
              className={`text-center py-2 rounded-t-lg mb-1 ${isHoje(dia) ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              <p className="text-xs font-medium">{DIAS[idx]}</p>
              <p className={`text-lg font-bold ${isHoje(dia) ? "" : "text-foreground"}`}>{format(dia, "d")}</p>
            </div>

            {/* Audiências do dia */}
            <div className="space-y-1">
              {loading ? (
                <div className="h-8 bg-muted animate-pulse rounded" />
              ) : audienciasDoDia(dia).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">—</p>
              ) : (
                audienciasDoDia(dia).map((aud) => (
                  <button
                    key={aud.id}
                    onClick={() => setSelecionada(aud)}
                    className={`w-full text-left px-1.5 py-1 rounded border text-xs truncate transition-opacity hover:opacity-80 ${STATUS_COLORS[aud.status] || "bg-muted border-border"}`}
                  >
                    <span className="font-medium">{aud.hora_audiencia}</span>
                    {" · "}
                    <span className="truncate">{aud.numero_processo}</span>
                  </button>
                ))
              )}
              {!loading && audienciasDoDia(dia).length > 3 && (
                <p className="text-xs text-muted-foreground text-center">+{audienciasDoDia(dia).length - 3} mais</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Totais da semana */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(STATUS_LABEL).map(([key, label]) => {
              const count = audiencias.filter((a) => a.status === key).length;
              return (
                <div key={key} className="text-center">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal detalhe */}
      <Dialog open={!!selecionada} onOpenChange={() => setSelecionada(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selecionada?.numero_processo}</DialogTitle>
            <DialogDescription>
              {selecionada &&
                format(new Date(selecionada.data_audiencia + "T00:00:00"), "EEEE, d 'de' MMMM yyyy", { locale: ptBR })}
              {" às "}
              {selecionada?.hora_audiencia}
            </DialogDescription>
          </DialogHeader>
          {selecionada && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Badge className={STATUS_COLORS[selecionada.status]}>{STATUS_LABEL[selecionada.status]}</Badge>
                {selecionada.carteira && <Badge variant="outline">{selecionada.carteira}</Badge>}
                {selecionada.tipo_audiencia && <Badge variant="secondary">{selecionada.tipo_audiencia}</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Autor</p>
                  <p>{selecionada.autor || "—"}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Réu</p>
                  <p>{selecionada.reu || "—"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
