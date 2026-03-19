import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isSameDay } from "date-fns";
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
  pendente: "bg-yellow-100 text-yellow-800",
  atribuida: "bg-green-100 text-green-800",
  concluida: "bg-blue-100 text-blue-800",
  presencial: "bg-orange-100 text-orange-800",
};

const CalendarioAudiencias = () => {
  const [audiencias, setAudiencias] = useState<Audiencia[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

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

  const audienciasDoDia = audiencias.filter((a) => {
    if (!a.data_audiencia || !selectedDate) return false;
    try {
      return isSameDay(parseISO(a.data_audiencia), selectedDate);
    } catch {
      return false;
    }
  });

  const datasComAudiencia = audiencias
    .map((a) => {
      try { return a.data_audiencia ? parseISO(a.data_audiencia) : null; } catch { return null; }
    })
    .filter(Boolean) as Date[];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Calendário de Audiências</h2>
      <div className="grid md:grid-cols-[auto_1fr] gap-6">
        <Card>
          <CardContent className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ptBR}
              modifiers={{ hasAudiencia: datasComAudiencia }}
              modifiersStyles={{ hasAudiencia: { fontWeight: "bold", textDecoration: "underline" } }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedDate
                ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                : "Selecione uma data"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {audienciasDoDia.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma audiência nesta data.</p>
            ) : (
              <div className="space-y-3">
                {audienciasDoDia.map((a) => (
                  <div key={a.id} className="border rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{a.autor} × {a.reu}</p>
                      <Badge className={statusColor[a.status] || ""}>{a.status}</Badge>
                    </div>
                    {a.numero_processo && (
                      <p className="text-xs text-muted-foreground">Processo: {a.numero_processo}</p>
                    )}
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      {a.hora_audiencia && <span>🕐 {a.hora_audiencia}</span>}
                      {a.carteira && <span>📁 {a.carteira}</span>}
                      {a.tipo_audiencia && <span>📋 {a.tipo_audiencia}</span>}
                    </div>
                    {(a.advogado || a.preposto) && (
                      <div className="flex gap-4 text-xs">
                        {a.advogado && <span className="text-primary">Adv: {a.advogado}</span>}
                        {a.preposto && <span className="text-muted-foreground">Prep: {a.preposto}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CalendarioAudiencias;
