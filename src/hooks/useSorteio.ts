import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Pessoa {
  id: string;
  nome: string;
  tipo: string;
  equipe: string | null;
  estado: string | null;
  ativo: boolean;
}

interface ResultadoItem {
  audienciaId: string;
  processo: string;
  carteira: string | null;
  presencial: boolean;
  advogado: Pessoa | null;
  preposto: Pessoa | null;
  motivo: string;
  equipeRecomendada?: string;
}

interface Resultado {
  total: number;
  atribuidas: number;
  presenciais: number;
  semDisponivel: number;
  itens: ResultadoItem[];
}

type Status = "idle" | "executando" | "concluido" | "erro";

const LIMITE_SEMANAL = 2;

function getInicioSemana(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function isPresencial(audiencia: { tipo_audiencia?: string | null; local?: string | null }): boolean {
  const tipo = (audiencia.tipo_audiencia || "").toLowerCase();
  const local = (audiencia.local || "").toLowerCase();
  return tipo.includes("presencial") || local.includes("presencial");
}

const CODIGO_ESTADO: Record<string, string> = {
  "8.01": "AC", "8.02": "AL", "8.03": "AP", "8.04": "AM", "8.05": "BA",
  "8.06": "CE", "8.07": "DF", "8.08": "ES", "8.09": "GO", "8.10": "MA",
  "8.11": "MT", "8.12": "MS", "8.13": "MG", "8.14": "PA", "8.15": "PB",
  "8.16": "PR", "8.17": "PE", "8.18": "PI", "8.19": "RJ", "8.20": "RN",
  "8.21": "RS", "8.22": "RO", "8.23": "RR", "8.24": "SC", "8.25": "SE",
  "8.26": "SP", "8.27": "TO",
};

function extrairUF(numero_processo: string | null): string | null {
  if (!numero_processo) return null;
  const match = numero_processo.match(/8\.(\d{2})/);
  if (match) {
    const codigo = `8.${match[1]}`;
    return CODIGO_ESTADO[codigo] || null;
  }
  return null;
}

function getEquipeCorrespondente(uf: string | null): string {
  if (uf === "RJ") return "Equipe MANA";
  if (uf === "MG") return "Equipe Mariana Goes";
  return "Equipe Thiago";
}

export function useSorteio() {
  const [status, setStatus] = useState<Status>("idle");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const { toast } = useToast();

  const limpar = () => {
    setResultado(null);
    setStatus("idle");
  };

  const realizarSorteio = async () => {
    setStatus("executando");
    try {
      // Buscar audiências pendentes
      const { data: audiencias, error: errAud } = await supabase
        .from("audiencias")
        .select("*")
        .eq("status", "pendente");
      if (errAud) throw errAud;
      if (!audiencias || audiencias.length === 0) {
        toast({ title: "Nenhuma audiência pendente encontrada" });
        setStatus("idle");
        return;
      }

      // Buscar pessoas ativas
      const { data: pessoas, error: errPes } = await supabase
        .from("pessoas")
        .select("*")
        .eq("ativo", true);
      if (errPes) throw errPes;

      const advogados = (pessoas || []).filter((p) => p.tipo === "advogado");
      const prepostos = (pessoas || []).filter((p) => p.tipo === "preposto");

      const semanaInicio = getInicioSemana(new Date());

      // Buscar atribuições da semana
      const { data: atribuicoes } = await supabase
        .from("atribuicoes")
        .select("*")
        .eq("semana_inicio", semanaInicio);

      const contagem: Record<string, number> = {};
      (atribuicoes || []).forEach((a) => {
        contagem[a.pessoa_id] = (contagem[a.pessoa_id] || 0) + 1;
      });

      const itens: ResultadoItem[] = [];
      let atribuidas = 0;
      let presenciais = 0;
      let semDisponivel = 0;

      for (const aud of audiencias) {
        const presencial = isPresencial(aud);

        if (presencial) {
          presenciais++;
          const uf = extrairUF(aud.numero_processo);
          const equipe = getEquipeCorrespondente(uf);
          itens.push({
            audienciaId: aud.id,
            processo: aud.numero_processo || aud.autor,
            carteira: aud.carteira,
            presencial: true,
            advogado: null,
            preposto: null,
            motivo: `Audiência presencial — encaminhar para correspondente (${equipe})`,
            equipeRecomendada: equipe,
          });

          await supabase
            .from("audiencias")
            .update({ status: "presencial", observacoes: `Correspondente: ${equipe}` })
            .eq("id", aud.id);
          continue;
        }

        // Filtrar por carteira/equipe
        const carteira = aud.carteira?.toUpperCase() || "";
        const advDisponiveis = advogados.filter((a) => {
          if ((contagem[a.id] || 0) >= LIMITE_SEMANAL) return false;
          if (carteira && a.equipe) return a.equipe.toUpperCase() === carteira;
          return !carteira;
        });
        const prepDisponiveis = prepostos.filter((p) => {
          if ((contagem[p.id] || 0) >= LIMITE_SEMANAL) return false;
          if (carteira && p.equipe) return p.equipe.toUpperCase() === carteira;
          return !carteira;
        });

        if (advDisponiveis.length === 0) {
          semDisponivel++;
          itens.push({
            audienciaId: aud.id,
            processo: aud.numero_processo || aud.autor,
            carteira: aud.carteira,
            presencial: false,
            advogado: null,
            preposto: null,
            motivo: `Nenhum advogado disponível para carteira "${carteira || "geral"}"`,
          });
          continue;
        }

        const advSorteado = advDisponiveis[Math.floor(Math.random() * advDisponiveis.length)];
        const prepSorteado = prepDisponiveis.length > 0
          ? prepDisponiveis[Math.floor(Math.random() * prepDisponiveis.length)]
          : null;

        contagem[advSorteado.id] = (contagem[advSorteado.id] || 0) + 1;
        if (prepSorteado) contagem[prepSorteado.id] = (contagem[prepSorteado.id] || 0) + 1;

        // Salvar atribuições
        const atribBatch = [
          { audiencia_id: aud.id, pessoa_id: advSorteado.id, semana_inicio: semanaInicio },
        ];
        if (prepSorteado) {
          atribBatch.push({ audiencia_id: aud.id, pessoa_id: prepSorteado.id, semana_inicio: semanaInicio });
        }
        await supabase.from("atribuicoes").insert(atribBatch);

        await supabase
          .from("audiencias")
          .update({
            status: "atribuida",
            advogado: advSorteado.nome,
            preposto: prepSorteado?.nome || null,
          })
          .eq("id", aud.id);

        atribuidas++;
        itens.push({
          audienciaId: aud.id,
          processo: aud.numero_processo || aud.autor,
          carteira: aud.carteira,
          presencial: false,
          advogado: advSorteado,
          preposto: prepSorteado,
          motivo: `Sorteado entre ${advDisponiveis.length} advogado(s) disponíveis`,
        });
      }

      const res: Resultado = {
        total: audiencias.length,
        atribuidas,
        presenciais,
        semDisponivel,
        itens,
      };
      setResultado(res);
      setStatus("concluido");

      // Salvar histórico
      await supabase.from("historico_sorteios").insert({
        total: res.total,
        atribuidas: res.atribuidas,
        presenciais: res.presenciais,
        sem_disponivel: res.semDisponivel,
        detalhes: JSON.stringify(res.itens.map((i) => ({
          processo: i.processo,
          advogado: i.advogado?.nome,
          preposto: i.preposto?.nome,
          motivo: i.motivo,
        }))),
      }).then(() => {});

      toast({ title: "Sorteio realizado!", description: `${atribuidas} audiências atribuídas` });
    } catch (err: any) {
      setStatus("erro");
      toast({ title: "Erro no sorteio", description: err.message, variant: "destructive" });
    }
  };

  return { status, resultado, realizarSorteio, limpar };
}
