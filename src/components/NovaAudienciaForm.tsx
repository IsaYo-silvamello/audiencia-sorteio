import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CalendarPlus } from "lucide-react";

const NovaAudienciaForm = () => {
  const realizarSorteioAutomatico = async () => {
    try {
      const { data: audienciasPendentes, error: audienciasError } = await supabase
        .from("audiencias")
        .select("*")
        .eq("status", "pendente");

      if (audienciasError) throw audienciasError;
      if (!audienciasPendentes || audienciasPendentes.length === 0) return;

      const { data: pessoasAtivas, error: pessoasError } = await supabase
        .from("pessoas")
        .select("*")
        .eq("ativo", true);

      if (pessoasError) throw pessoasError;
      if (!pessoasAtivas || pessoasAtivas.length === 0) return;

      const dataAtual = new Date();
      const inicioDaSemana = new Date(dataAtual);
      inicioDaSemana.setDate(dataAtual.getDate() - dataAtual.getDay());
      inicioDaSemana.setHours(0, 0, 0, 0);

      const { data: atribuicoesSemanais, error: atribuicoesError } = await supabase
        .from("atribuicoes")
        .select("pessoa_id")
        .gte("semana_inicio", inicioDaSemana.toISOString());

      if (atribuicoesError) throw atribuicoesError;

      const contagemAtribuicoes = atribuicoesSemanais?.reduce((acc: any, curr: any) => {
        acc[curr.pessoa_id] = (acc[curr.pessoa_id] || 0) + 1;
        return acc;
      }, {}) || {};

      const atribuicoesParaInserir = [];

      for (const audiencia of audienciasPendentes) {
        const carteiraAudiencia = (audiencia.carteira || "").trim().toUpperCase();

        // Filtrar advogados por equipe compatível + limite de 2
        const advogados = pessoasAtivas.filter((p) => p.tipo === "advogado");
        const advDisponiveis = advogados.filter((p) => {
          const equipe = ((p as any).equipe || "").trim().toUpperCase();
          if (!carteiraAudiencia || !equipe) return true;
          return equipe === carteiraAudiencia;
        }).filter((p) => (contagemAtribuicoes[p.id] || 0) < 2);

        // Filtrar prepostos por equipe compatível + limite de 2
        const prepostos = pessoasAtivas.filter((p) => p.tipo === "preposto");
        const prepDisponiveis = prepostos.filter((p) => {
          const equipe = ((p as any).equipe || "").trim().toUpperCase();
          if (!carteiraAudiencia || !equipe) return true;
          return equipe === carteiraAudiencia;
        }).filter((p) => (contagemAtribuicoes[p.id] || 0) < 2);

        if (advDisponiveis.length > 0) {
          const advSorteado = advDisponiveis[Math.floor(Math.random() * advDisponiveis.length)];
          atribuicoesParaInserir.push({
            audiencia_id: audiencia.id,
            pessoa_id: advSorteado.id,
            semana_inicio: inicioDaSemana.toISOString().split("T")[0],
          });
          contagemAtribuicoes[advSorteado.id] = (contagemAtribuicoes[advSorteado.id] || 0) + 1;
        }

        if (prepDisponiveis.length > 0) {
          const prepSorteado = prepDisponiveis[Math.floor(Math.random() * prepDisponiveis.length)];
          atribuicoesParaInserir.push({
            audiencia_id: audiencia.id,
            pessoa_id: prepSorteado.id,
            semana_inicio: inicioDaSemana.toISOString().split("T")[0],
          });
          contagemAtribuicoes[prepSorteado.id] = (contagemAtribuicoes[prepSorteado.id] || 0) + 1;
        }
      }

      if (atribuicoesParaInserir.length > 0) {
        await supabase.from("atribuicoes").insert(atribuicoesParaInserir);

        const idsAudienciasAtribuidas = [...new Set(atribuicoesParaInserir.map((a) => a.audiencia_id))];
        await supabase
          .from("audiencias")
          .update({ status: "atribuida" })
          .in("id", idsAudienciasAtribuidas);
      }
    } catch (error) {
      console.error("Erro no sorteio automático:", error);
    }
  };
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    numero_processo: "",
    data_audiencia: "",
    hora_audiencia: "",
    autor: "",
    reu: "",
    assunto: "",
    link: "",
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("audiencias").insert([
        {
          ...formData,
          status: "pendente",
        },
      ]);

      if (error) throw error;

      await realizarSorteioAutomatico();

      toast({
        title: "Audiência cadastrada com sucesso",
        description: "A audiência foi adicionada e o sorteio foi realizado.",
      });

      setFormData({
        numero_processo: "",
        data_audiencia: "",
        hora_audiencia: "",
        autor: "",
        reu: "",
        assunto: "",
        link: "",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar audiência",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarPlus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Cadastrar Nova Audiência</CardTitle>
            <CardDescription>
              Preencha os dados da audiência publicada no DJEN
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero_processo">Número do Processo</Label>
              <Input
                id="numero_processo"
                placeholder="0000000-00.0000.0.00.0000"
                value={formData.numero_processo}
                onChange={(e) =>
                  setFormData({ ...formData, numero_processo: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_audiencia">Data da Audiência</Label>
              <Input
                id="data_audiencia"
                type="date"
                value={formData.data_audiencia}
                onChange={(e) =>
                  setFormData({ ...formData, data_audiencia: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hora_audiencia">Hora da Audiência</Label>
              <Input
                id="hora_audiencia"
                type="time"
                value={formData.hora_audiencia}
                onChange={(e) =>
                  setFormData({ ...formData, hora_audiencia: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="autor">Autor</Label>
            <Textarea
              id="autor"
              placeholder="Nome do autor"
              value={formData.autor}
              onChange={(e) => setFormData({ ...formData, autor: e.target.value })}
              required
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reu">Réu</Label>
            <Textarea
              id="reu"
              placeholder="Nome do réu"
              value={formData.reu}
              onChange={(e) => setFormData({ ...formData, reu: e.target.value })}
              required
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link">Link da Audiência</Label>
            <Textarea
              id="link"
              placeholder="Cole o link aqui"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assunto">Assunto do Processo</Label>
            <Textarea
              id="assunto"
              placeholder="Descrição do assunto"
              value={formData.assunto}
              onChange={(e) => setFormData({ ...formData, assunto: e.target.value })}
              required
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Cadastrando..." : "Cadastrar Audiência"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default NovaAudienciaForm;
