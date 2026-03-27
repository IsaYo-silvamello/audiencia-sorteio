import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Scale, Briefcase, CalendarOff, GraduationCap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Pessoa {
  id: string;
  nome: string;
  tipo: string;
  ativo: boolean;
  documento: string | null;
  tipo_advogado?: string | null;
  estado?: string | null;
  valor_audiencia?: number | null;
  equipe?: string | null;
  carteira?: string | null;
  observacao?: string | null;
  tipo_preposto?: string | null;
  horario_trabalho?: string | null;
}

interface Afastamento {
  id: string;
  pessoa_id: string;
  tipo: string;
  data_inicio: string;
  data_fim: string;
}

const PessoasList = () => {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [afastamentos, setAfastamentos] = useState<Afastamento[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pessoasRes, afastRes] = await Promise.all([
          supabase.from("pessoas").select("*").eq("ativo", true).order("nome"),
          supabase.from("afastamentos").select("*").gte("data_fim", new Date().toISOString().split("T")[0]),
        ]);
        if (pessoasRes.error) throw pessoasRes.error;
        setPessoas(pessoasRes.data || []);
        setAfastamentos((afastRes.data as any[]) || []);
      } catch (error: any) {
        toast({ variant: "destructive", title: "Erro ao carregar pessoas", description: error.message });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getAfastamentoAtivo = (pessoaId: string): Afastamento | null => {
    const today = new Date().toISOString().split("T")[0];
    return afastamentos.find((a) => a.pessoa_id === pessoaId && a.data_inicio <= today && a.data_fim >= today) || null;
  };

  const advogados = pessoas.filter((p) => p.tipo === "advogado");
  const prepostos = pessoas.filter((p) => p.tipo === "preposto");

  const renderPessoaCard = (pessoa: Pessoa) => (
    <div
      key={pessoa.id}
      className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
    >
      <div className="space-y-1">
        <span className="font-medium text-foreground">{pessoa.nome}</span>
        <div className="flex flex-wrap gap-1.5 text-sm text-muted-foreground">
          {pessoa.documento && <span>OAB/CPF: {pessoa.documento}</span>}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {pessoa.tipo_advogado && (
            <Badge variant="outline" className="text-[11px] capitalize">{pessoa.tipo_advogado}</Badge>
          )}
          {pessoa.tipo_preposto && (
            <Badge variant="outline" className="text-[11px] capitalize">
              {pessoa.tipo_preposto === "estagiario" ? "Estagiário" : "Assistente"}
            </Badge>
          )}
          {pessoa.tipo_preposto === "estagiario" && pessoa.horario_trabalho && (
            <Badge variant="secondary" className="text-[11px]">{pessoa.horario_trabalho}</Badge>
          )}
          {pessoa.tipo_advogado === "externo" && pessoa.estado && (
            <Badge variant="secondary" className="text-[11px]">{pessoa.estado}</Badge>
          )}
          {pessoa.tipo_advogado === "externo" && pessoa.valor_audiencia && (
            <Badge variant="secondary" className="text-[11px]">R$ {pessoa.valor_audiencia.toFixed(2)}</Badge>
          )}
          {pessoa.observacao && (
            <Badge variant="secondary" className="text-[11px]">{pessoa.observacao}</Badge>
          )}
        </div>
        {pessoa.equipe && (
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-medium text-primary">Cliente:</span> {pessoa.equipe}
          </p>
        )}
        {pessoa.carteira && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Carteira:</span> {pessoa.carteira}
          </p>
        )}
      </div>
    </div>
  );

  const renderList = (list: Pessoa[], emptyMsg: string) => (
    list.length === 0 ? (
      <p className="text-center text-muted-foreground py-8">{emptyMsg}</p>
    ) : (
      <div className="space-y-2">
        {list.map(renderPessoaCard)}
      </div>
    )
  );

  if (loading) {
    return <p className="text-center text-muted-foreground py-8">Carregando...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Colaboradores</h2>
        <p className="text-sm text-muted-foreground">{pessoas.length} colaboradores ativos</p>
      </div>

      <Tabs defaultValue="advogados" className="w-full">
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="advogados" className="flex-1 gap-2">
            <Scale className="h-4 w-4" />
            Advogados ({advogados.length})
          </TabsTrigger>
          <TabsTrigger value="prepostos" className="flex-1 gap-2">
            <Briefcase className="h-4 w-4" />
            Prepostos ({prepostos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="advogados" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                Advogados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderList(advogados, "Nenhum advogado cadastrado")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prepostos" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                Prepostos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderList(prepostos, "Nenhum preposto cadastrado")}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PessoasList;
