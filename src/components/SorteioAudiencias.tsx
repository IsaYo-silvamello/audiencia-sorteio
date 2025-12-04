import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shuffle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SorteioAudiencias = () => {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const { toast } = useToast();

  const realizarSorteio = async () => {
    setLoading(true);
    setResultado(null);

    try {
      // Buscar audiências pendentes
      const { data: audienciasPendentes, error: audienciasError } = await supabase
        .from("audiencias")
        .select("*")
        .eq("status", "pendente")
        .order("data_audiencia");

      if (audienciasError) throw audienciasError;

      if (!audienciasPendentes || audienciasPendentes.length === 0) {
        toast({
          title: "Nenhuma audiência pendente",
          description: "Não há audiências disponíveis para sorteio.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Buscar pessoas ativas separadas por tipo
      const { data: pessoas, error: pessoasError } = await supabase
        .from("pessoas")
        .select("*")
        .eq("ativo", true);

      if (pessoasError) throw pessoasError;

      const advogados = pessoas?.filter((p) => p.tipo === "advogado") || [];
      const prepostos = pessoas?.filter((p) => p.tipo === "preposto") || [];

      if (advogados.length === 0 || prepostos.length === 0) {
        toast({
          title: "Cadastro incompleto",
          description: "É necessário ter pelo menos 1 advogado e 1 preposto cadastrados.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Calcular início da semana atual
      const hoje = new Date();
      const diaSemana = hoje.getDay();
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - diaSemana);
      inicioSemana.setHours(0, 0, 0, 0);

      // Buscar atribuições da semana atual
      const { data: atribuicoesSemanais, error: atribuicoesError } = await supabase
        .from("atribuicoes")
        .select("pessoa_id")
        .gte("semana_inicio", inicioSemana.toISOString().split("T")[0]);

      if (atribuicoesError) throw atribuicoesError;

      // Contar audiências por pessoa na semana
      const contagemPorPessoa = new Map();
      atribuicoesSemanais?.forEach((atr) => {
        const count = contagemPorPessoa.get(atr.pessoa_id) || 0;
        contagemPorPessoa.set(atr.pessoa_id, count + 1);
      });

      // Filtrar pessoas disponíveis (menos de 2 na semana)
      const advogadosDisponiveis = advogados.filter(
        (p) => (contagemPorPessoa.get(p.id) || 0) < 2
      );
      const prepostosDisponiveis = prepostos.filter(
        (p) => (contagemPorPessoa.get(p.id) || 0) < 2
      );

      if (advogadosDisponiveis.length === 0 || prepostosDisponiveis.length === 0) {
        toast({
          title: "Limite atingido",
          description: "Não há advogados ou prepostos disponíveis (limite de 2 audiências/semana).",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const atribuicoes = [];
      const resultadoSorteio: any[] = [];

      for (const audiencia of audienciasPendentes) {
        // Verificar disponíveis atualizados
        const advDisponiveis = advogados.filter(
          (p) => (contagemPorPessoa.get(p.id) || 0) < 2
        );
        const prepDisponiveis = prepostos.filter(
          (p) => (contagemPorPessoa.get(p.id) || 0) < 2
        );

        if (advDisponiveis.length === 0 || prepDisponiveis.length === 0) break;

        // Sortear 1 advogado
        const advogadoSorteado =
          advDisponiveis[Math.floor(Math.random() * advDisponiveis.length)];

        // Sortear 1 preposto
        const prepostoSorteado =
          prepDisponiveis[Math.floor(Math.random() * prepDisponiveis.length)];

        // Adicionar atribuição do advogado
        atribuicoes.push({
          audiencia_id: audiencia.id,
          pessoa_id: advogadoSorteado.id,
          semana_inicio: inicioSemana.toISOString().split("T")[0],
        });

        // Adicionar atribuição do preposto
        atribuicoes.push({
          audiencia_id: audiencia.id,
          pessoa_id: prepostoSorteado.id,
          semana_inicio: inicioSemana.toISOString().split("T")[0],
        });

        resultadoSorteio.push({
          processo: audiencia.numero_processo,
          advogado: advogadoSorteado.nome,
          preposto: prepostoSorteado.nome,
        });

        // Atualizar contagem
        contagemPorPessoa.set(advogadoSorteado.id, (contagemPorPessoa.get(advogadoSorteado.id) || 0) + 1);
        contagemPorPessoa.set(prepostoSorteado.id, (contagemPorPessoa.get(prepostoSorteado.id) || 0) + 1);
      }

      // Inserir atribuições no banco
      if (atribuicoes.length > 0) {
        const { error: insertError } = await supabase
          .from("atribuicoes")
          .insert(atribuicoes);

        if (insertError) throw insertError;

        // Atualizar status das audiências
        const audienciasIds = atribuicoes.map((a) => a.audiencia_id);
        const { error: updateError } = await supabase
          .from("audiencias")
          .update({ status: "atribuida" })
          .in("id", audienciasIds);

        if (updateError) throw updateError;

        setResultado(resultadoSorteio);
        toast({
          title: "Sorteio realizado com sucesso",
          description: `${atribuicoes.length} audiência(s) foram atribuídas.`,
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao realizar sorteio",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shuffle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Sorteio de Audiências</CardTitle>
              <CardDescription>
                Distribui automaticamente as audiências pendentes respeitando o limite de 2
                por semana
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              O sorteio atribuirá as audiências pendentes para advogados e prepostos
              disponíveis, respeitando o limite máximo de 2 audiências por pessoa na
              semana.
            </AlertDescription>
          </Alert>

          <Button
            onClick={realizarSorteio}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            <Shuffle className="h-5 w-5 mr-2" />
            {loading ? "Realizando sorteio..." : "Realizar Sorteio"}
          </Button>
        </CardContent>
      </Card>

      {resultado && resultado.length > 0 && (
        <Card className="border-success">
          <CardHeader>
            <CardTitle className="text-success">Resultado do Sorteio</CardTitle>
            <CardDescription>{resultado.length} audiências atribuídas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {resultado.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-success/5 border border-success/20"
                >
                  <p className="font-semibold text-foreground mb-2">{item.processo}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-primary">ADVOGADO</span>
                      <span className="text-sm text-muted-foreground">{item.advogado}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-secondary-foreground">PREPOSTO</span>
                      <span className="text-sm text-muted-foreground">{item.preposto}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SorteioAudiencias;
