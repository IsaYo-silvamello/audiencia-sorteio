import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FileText, Users, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Audiencia {
  id: string;
  numero_processo: string;
  data_audiencia: string;
  hora_audiencia: string;
  partes: string;
  assunto: string;
  status: string;
  atribuicoes?: Array<{
    pessoa: {
      nome: string;
      tipo: string;
    };
  }>;
}

const AudienciasList = () => {
  const [audiencias, setAudiencias] = useState<Audiencia[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAudiencias = async () => {
    try {
      const { data, error } = await supabase
        .from("audiencias")
        .select(`
          *,
          atribuicoes:atribuicoes (
            pessoa:pessoas (
              nome,
              tipo
            )
          )
        `)
        .order("data_audiencia", { ascending: true })
        .order("hora_audiencia", { ascending: true });

      if (error) throw error;
      setAudiencias((data || []) as any);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar audiências",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudiencias();

    const channel = supabase
      .channel("audiencias-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "audiencias",
        },
        () => {
          fetchAudiencias();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("audiencias").delete().eq("id", id);
      if (error) throw error;

      toast({
        title: "Audiência excluída",
        description: "A audiência foi removida do sistema.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir audiência",
        description: error.message,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return <Badge variant="outline">Pendente</Badge>;
      case "atribuida":
        return <Badge className="bg-success text-success-foreground">Atribuída</Badge>;
      case "realizada":
        return <Badge variant="secondary">Realizada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando audiências...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Audiências Cadastradas</h2>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {audiencias.length} audiências
        </Badge>
      </div>

      {audiencias.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma audiência cadastrada</h3>
            <p className="text-muted-foreground">
              Cadastre a primeira audiência na aba "Nova Audiência"
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {audiencias.map((audiencia) => (
            <Card key={audiencia.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      {audiencia.numero_processo}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(audiencia.data_audiencia), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {audiencia.hora_audiencia}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(audiencia.status)}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(audiencia.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Partes</p>
                  <p className="text-sm text-muted-foreground">{audiencia.partes}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Assunto</p>
                  <p className="text-sm text-muted-foreground">{audiencia.assunto}</p>
                </div>
                {audiencia.atribuicoes && audiencia.atribuicoes.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Atribuído a:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {audiencia.atribuicoes.map((atr: any, idx: number) => (
                        <Badge key={idx} variant="secondary">
                          {atr.pessoa.nome} ({atr.pessoa.tipo})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AudienciasList;
