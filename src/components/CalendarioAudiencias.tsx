import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
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
}

const statusColor: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800 border-yellow-300",
  atribuida: "bg-green-100 text-green-800 border-green-300",
  concluida: "bg-blue-100 text-blue-800 border-blue-300",
  presencial: "bg-orange-100 text-orange-800 border-orange-300",
};

const CalendarioAudiencias = () => {
  const [audiencias, setAudiencias] = useState<Audiencia[]>([]);
  const [semanaRef, setSemanaRef] = useState(new Date());
  const [selected, setSelected] = useState<Audiencia | null>(null);

  useEffect(() => {
    const fetchAudiencias = async () => {
      const { data } = await supabase
        .from("audiencias")
        .select("id, autor, reu, numero_processo, data_audiencia, hora_audiencia, status, carteira, tipo_audiencia, advogado, preposto")
        .not("data_audiencia", "is", null);
      if (data) setAudiencias(data);
    };
    fetchAudiencias();
  }, []);

  const inicio = startOfWeek(semanaRef, { weekStartsOn: 1 });
  const fim = endOfWeek(semanaRef, { weekStartsOn: 1 });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Calendário de Audiências</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setSemanaRef(subWeeks(semanaRef, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[200px] text-center">
            {format(inicio, "dd/MM", { locale: ptBR })} — {format(fim, "dd/MM/yyyy", { locale: ptBR })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setSemanaRef(addWeeks(semanaRef, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSemanaRef(new Date())}>Hoje</Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {dias.map((dia) => {
          const key = format(dia, "yyyy-MM-dd");
          const auds = audienciasPorDia[key] || [];
          const isToday = isSameDay(dia, new Date());
          return (
            <Card key={key} className={`min-h-[120px] ${isToday ? "ring-2 ring-primary" : ""}`}>
              <CardHeader className="p-2 pb-1">
                <p className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                  {format(dia, "EEE dd", { locale: ptBR })}
                </p>
              </CardHeader>
              <CardContent className="p-2 pt-0 space-y-1">
                {auds.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                {auds.slice(0, 3).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelected(a)}
                    className="w-full text-left"
                  >
                    <Badge variant="outline" className={`text-[10px] w-full justify-start truncate ${statusColor[a.status] || ""}`}>
                      {a.hora_audiencia ? `${a.hora_audiencia} ` : ""}{a.autor.substring(0, 12)}
                    </Badge>
                  </button>
                ))}
                {auds.length > 3 && (
                  <p className="text-[10px] text-muted-foreground">+{auds.length - 3} mais</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.autor} × {selected?.reu}</DialogTitle>
            <DialogDescription>Detalhes da audiência</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-2 text-sm">
              {selected.numero_processo && <p><strong>Processo:</strong> {selected.numero_processo}</p>}
              <p><strong>Data:</strong> {selected.data_audiencia} {selected.hora_audiencia && `às ${selected.hora_audiencia}`}</p>
              <p><strong>Status:</strong> <Badge className={statusColor[selected.status] || ""}>{selected.status}</Badge></p>
              {selected.carteira && <p><strong>Carteira:</strong> {selected.carteira}</p>}
              {selected.tipo_audiencia && <p><strong>Tipo:</strong> {selected.tipo_audiencia}</p>}
              {selected.advogado && <p><strong>Advogado:</strong> {selected.advogado}</p>}
              {selected.preposto && <p><strong>Preposto:</strong> {selected.preposto}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarioAudiencias;
