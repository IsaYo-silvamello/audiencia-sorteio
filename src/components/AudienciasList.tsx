import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FileText, Users, Search, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Audiencia {
  id: string;
  numero_processo: string;
  data_audiencia: string;
  hora_audiencia: string;
  autor: string;
  reu: string;
  assunto: string;
  status: string;
  atribuicoes?: Array<{
    pessoa: {
      id: string;
      nome: string;
      tipo: string;
      documento: string | null;
    };
  }>;
}

const AudienciasList = () => {
  const [audiencias, setAudiencias] = useState<Audiencia[]>([]);
  const [filteredAudiencias, setFilteredAudiencias] = useState<Audiencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchNome, setSearchNome] = useState("");
  const [searchDoc, setSearchDoc] = useState("");
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
              tipo,
              id,
              documento
            )
          )
        `)
        .order("data_audiencia", { ascending: true })
        .order("hora_audiencia", { ascending: true });

      if (error) throw error;
      
      // Fetch pessoas data separately to get OAB/CPF
      const audienciasWithPessoas = await Promise.all(
        (data || []).map(async (aud: any) => {
          if (aud.atribuicoes?.length > 0) {
            const pessoaIds = aud.atribuicoes.map((atr: any) => atr.pessoa.id);
            const { data: pessoasData } = await supabase
              .from("pessoas")
              .select("id, nome, tipo, documento")
              .in("id", pessoaIds);
            
            return {
              ...aud,
              atribuicoes: aud.atribuicoes.map((atr: any) => ({
                ...atr,
                pessoa: pessoasData?.find((p) => p.id === atr.pessoa.id) || atr.pessoa,
              })),
            };
          }
          return aud;
        })
      );
      
      setAudiencias(audienciasWithPessoas as any);
      setFilteredAudiencias(audienciasWithPessoas as any);
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
    const filtered = audiencias.filter((aud) => {
      const matchNome = !searchNome || 
        (aud.atribuicoes?.some((atr: any) => 
          atr.pessoa?.nome?.toLowerCase().includes(searchNome.toLowerCase())
        ) ?? false);
      
      const matchDoc = !searchDoc || 
        (aud.atribuicoes?.some((atr: any) => 
          atr.pessoa?.documento?.includes(searchDoc)
        ) ?? false) ||
        aud.numero_processo?.includes(searchDoc);
      
      return matchNome && matchDoc;
    });
    
    setFilteredAudiencias(filtered);
  }, [searchNome, searchDoc, audiencias]);

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

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("audiencias")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Audiência marcada como ${newStatus === "realizada" ? "Realizado" : "Não Realizado"}.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: error.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // First delete related atribuicoes
      await supabase.from("atribuicoes").delete().eq("audiencia_id", id);
      
      const { error } = await supabase
        .from("audiencias")
        .delete()
        .eq("id", id);
      if (error) throw error;

      // Update local state immediately
      setAudiencias((prev) => prev.filter((aud) => aud.id !== id));

      toast({
        title: "Audiência excluída",
        description: "A audiência foi removida com sucesso.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir audiência",
        description: error.message,
      });
    }
  };

  const handleTratarChange = (id: string, value: string) => {
    if (value === "excluir") {
      handleDelete(id);
    } else {
      handleStatusChange(id, value);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return <Badge variant="outline">Pendente</Badge>;
      case "atribuida":
        return <Badge className="bg-success text-success-foreground">Atribuída</Badge>;
      case "realizada":
        return <Badge className="bg-green-600 text-white">Realizado</Badge>;
      case "nao_realizada":
        return <Badge variant="destructive">Não Realizado</Badge>;
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
          {filteredAudiencias.length} audiências
        </Badge>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome do advogado/preposto"
                value={searchNome}
                onChange={(e) => setSearchNome(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por OAB/CPF ou número do processo"
                value={searchDoc}
                onChange={(e) => setSearchDoc(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredAudiencias.length === 0 ? (
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
          {filteredAudiencias.map((audiencia) => (
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
                  <div className="flex items-center gap-3">
                    {getStatusBadge(audiencia.status)}
                    <Select
                      onValueChange={(value) => handleTratarChange(audiencia.id, value)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Tratar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realizada">Realizado</SelectItem>
                        <SelectItem value="nao_realizada">Não Realizado</SelectItem>
                        <SelectItem value="excluir" className="text-destructive">
                          <span className="flex items-center gap-2">
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Autor</p>
                    <p className="text-sm text-muted-foreground">{audiencia.autor}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Réu</p>
                    <p className="text-sm text-muted-foreground">{audiencia.reu}</p>
                  </div>
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
                        <div key={idx} className="flex flex-col gap-1">
                          <Badge variant="secondary">
                            {atr.pessoa.nome} ({atr.pessoa.tipo})
                          </Badge>
                          {atr.pessoa.documento && (
                            <span className="text-xs text-muted-foreground ml-1">
                              {atr.pessoa.tipo === 'advogado' ? 'OAB' : 'CPF'}: {atr.pessoa.documento}
                            </span>
                          )}
                        </div>
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
