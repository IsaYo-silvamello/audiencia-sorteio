import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Historico {
  id: string;
  executado_em: string;
  total: number;
  atribuidas: number;
  presenciais: number;
  sem_disponivel: number;
  detalhes: string | null;
}

const HistoricoSorteios = () => {
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("historico_sorteios")
        .select("*")
        .order("executado_em", { ascending: false })
        .limit(50);
      if (data) setHistorico(data as Historico[]);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <p className="text-muted-foreground">Carregando...</p>;
  if (historico.length === 0) return <p className="text-muted-foreground">Nenhum sorteio realizado ainda.</p>;

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead className="text-center">Total</TableHead>
              <TableHead className="text-center">Atribuídas</TableHead>
              <TableHead className="text-center">Presenciais</TableHead>
              <TableHead className="text-center">Sem disponível</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historico.map((h) => (
              <TableRow key={h.id}>
                <TableCell>
                  {format(parseISO(h.executado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-center">{h.total}</TableCell>
                <TableCell className="text-center text-green-600 font-medium">{h.atribuidas}</TableCell>
                <TableCell className="text-center text-yellow-600 font-medium">{h.presenciais}</TableCell>
                <TableCell className="text-center text-destructive font-medium">{h.sem_disponivel}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default HistoricoSorteios;
