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

export interface SemanaDisponivel {
  inicio: string;
  fim: string;
  totalAudiencias: number;
  sorteada: boolean;
  dataSorteio?: string;
}

type Status = "idle" | "executando" | "concluido" | "erro";

const LIMITE_SEMANAL = 3;

function foraDoExpediente(hora: string | null): boolean {
  if (!hora) return false;
  return hora < "09:00" || hora >= "18:00";
}

function getInicioSemana(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function getFimSemana(inicioStr: string): string {
  const d = new Date(inicioStr + "T00:00:00");
  d.setDate(d.getDate() + 6);
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
  const [semanasDisponiveis, setSemanasDisponiveis] = useState<SemanaDisponivel[]>([]);
  const { toast } = useToast();

  const limpar = () => {
    setResultado(null);
    setStatus("idle");
  };

  const carregarSemanas = async () => {
    // Get all audiências with dates
    const { data: audiencias } = await supabase
      .from("audiencias")
      .select("data_audiencia")
      .eq("status", "pendente")
      .not("data_audiencia", "is", null);

    if (!audiencias || audiencias.length === 0) {
      setSemanasDisponiveis([]);
      return;
    }

    // Group by week (only pending)
    const semanasMap: Record<string, number> = {};
    for (const aud of audiencias) {
      if (!aud.data_audiencia) continue;
      const inicio = getInicioSemana(aud.data_audiencia);
      semanasMap[inicio] = (semanasMap[inicio] || 0) + 1;
    }

    // Get sorteios already done (with semana_inicio)
    const { data: sorteios } = await supabase
      .from("historico_sorteios")
      .select("semana_inicio, executado_em");

    const sorteioMap: Record<string, string> = {};
    if (sorteios) {
      for (const s of sorteios) {
        if ((s as any).semana_inicio) {
          sorteioMap[(s as any).semana_inicio] = s.executado_em;
        }
      }
    }

    const semanas: SemanaDisponivel[] = Object.entries(semanasMap)
      .map(([inicio, total]) => ({
        inicio,
        fim: getFimSemana(inicio),
        totalAudiencias: total,
        sorteada: false, // Always available since we only loaded pending
        dataSorteio: sorteioMap[inicio] || undefined,
      }))
      .sort((a, b) => a.inicio.localeCompare(b.inicio));

    setSemanasDisponiveis(semanas);
  };

  const realizarSorteio = async (semanaInicio: string) => {
    setStatus("executando");
    const semanaFim = getFimSemana(semanaInicio);

    try {
      // Buscar audiências pendentes da semana selecionada
      const { data: audiencias, error: errAud } = await supabase
        .from("audiencias")
        .select("*")
        .eq("status", "pendente")
        .gte("data_audiencia", semanaInicio)
        .lte("data_audiencia", semanaFim);

      if (errAud) throw errAud;
      if (!audiencias || audiencias.length === 0) {
        toast({ title: "Nenhuma audiência pendente nesta semana" });
        setStatus("idle");
        return;
      }

      // Buscar pessoas ativas
      const { data: pessoas, error: errPes } = await supabase
        .from("pessoas")
        .select("*")
        .eq("ativo", true);
      if (errPes) throw errPes;

      // Buscar afastamentos ativos para filtrar pessoas
      const { data: afastamentos } = await supabase
        .from("afastamentos")
        .select("*")
        .lte("data_inicio", semanaFim)
        .gte("data_fim", semanaInicio);

      const afastamentosAtivos = afastamentos || [];

      // Função para verificar se pessoa está disponível para uma audiência
      const pessoaDisponivel = (pessoaId: string, dataAudiencia: string, horaAudiencia: string | null) => {
        const afasts = afastamentosAtivos.filter((a: any) => a.pessoa_id === pessoaId);
        for (const af of afasts) {
          if (dataAudiencia >= af.data_inicio && dataAudiencia <= af.data_fim) {
            if (af.tipo === "ferias") return false;
            if (af.tipo === "provas" && horaAudiencia && af.horario_especial_inicio && af.horario_especial_fim) {
              // Só disponível se audiência está dentro do horário especial
              if (horaAudiencia < af.horario_especial_inicio || horaAudiencia > af.horario_especial_fim) {
                return false;
              }
            }
          }
        }
        return true;
      };

      const advogados = (pessoas || []).filter((p) => p.tipo === "advogado");
      const prepostos = (pessoas || []).filter((p) => p.tipo === "preposto");

      // Buscar atribuições existentes da semana para contagem semanal
      const { data: atribuicoes } = await supabase
        .from("atribuicoes")
        .select("*")
        .eq("semana_inicio", semanaInicio);

      // Contagem semanal por pessoa
      const contagemSemanal: Record<string, number> = {};
      (atribuicoes || []).forEach((a: any) => {
        contagemSemanal[a.pessoa_id] = (contagemSemanal[a.pessoa_id] || 0) + 1;
      });

      const getContagemSemanal = (pessoaId: string) => {
        return contagemSemanal[pessoaId] || 0;
      };

      const addContagem = (pessoaId: string) => {
        contagemSemanal[pessoaId] = (contagemSemanal[pessoaId] || 0) + 1;
      };

      const itens: ResultadoItem[] = [];
      let atribuidas = 0;
      let presenciaisCount = 0;
      let semDisponivel = 0;

      for (const aud of audiencias) {
        const presencial = isPresencial(aud);
        const diaAudiencia = aud.data_audiencia || "unknown";
        const horaAud = aud.hora_audiencia || null;

        // Presencial OU fora do expediente → correspondente externo
        if (presencial || foraDoExpediente(horaAud)) {
          presenciaisCount++;
          const uf = extrairUF(aud.numero_processo);
          const equipe = getEquipeCorrespondente(uf);
          const razao = presencial
            ? `Audiência presencial — encaminhar para correspondente (${equipe})`
            : `Audiência fora do expediente (${horaAud}) — encaminhar para correspondente (${equipe})`;
          itens.push({
            audienciaId: aud.id,
            processo: aud.numero_processo || aud.autor,
            carteira: aud.carteira,
            presencial: true,
            advogado: null,
            preposto: null,
            motivo: razao,
            equipeRecomendada: equipe,
          });

          await supabase
            .from("audiencias")
            .update({ status: "presencial", observacoes: `Correspondente: ${equipe}` })
            .eq("id", aud.id);
          continue;
        }

        // Filtrar por carteira/equipe e limite semanal
        const carteira = aud.carteira?.toUpperCase() || "";
        const advDisponiveis = advogados.filter((a) => {
          if (!pessoaDisponivel(a.id, diaAudiencia, horaAud)) return false;
          if (getContagemSemanal(a.id) >= LIMITE_SEMANAL) return false;
          if (carteira && a.equipe) return a.equipe.toUpperCase() === carteira;
          return !carteira;
        });
        const prepDisponiveis = prepostos.filter((p) => {
          if (!pessoaDisponivel(p.id, diaAudiencia, horaAud)) return false;
          if (getContagemSemanal(p.id) >= LIMITE_SEMANAL) return false;
          if (carteira && p.equipe) return p.equipe.toUpperCase() === carteira;
          return !carteira;
        });

        // Sem advogado E sem preposto
        if (advDisponiveis.length === 0 && prepDisponiveis.length === 0) {
          semDisponivel++;
          const uf = extrairUF(aud.numero_processo);
          const equipe = getEquipeCorrespondente(uf);
          itens.push({
            audienciaId: aud.id,
            processo: aud.numero_processo || aud.autor,
            carteira: aud.carteira,
            presencial: false,
            advogado: null,
            preposto: null,
            motivo: `Nenhum advogado ou preposto disponível — encaminhar para correspondente (${equipe})`,
            equipeRecomendada: equipe,
          });
          continue;
        }

        const advSorteado = advDisponiveis.length > 0
          ? advDisponiveis[Math.floor(Math.random() * advDisponiveis.length)]
          : null;
        const prepSorteado = prepDisponiveis.length > 0
          ? prepDisponiveis[Math.floor(Math.random() * prepDisponiveis.length)]
          : null;

        if (advSorteado) addContagem(advSorteado.id);
        if (prepSorteado) addContagem(prepSorteado.id);

        // Salvar atribuições
        const atribBatch: { audiencia_id: string; pessoa_id: string; semana_inicio: string }[] = [];
        if (advSorteado) atribBatch.push({ audiencia_id: aud.id, pessoa_id: advSorteado.id, semana_inicio: semanaInicio });
        if (prepSorteado) atribBatch.push({ audiencia_id: aud.id, pessoa_id: prepSorteado.id, semana_inicio: semanaInicio });
        if (atribBatch.length > 0) await supabase.from("atribuicoes").insert(atribBatch);

        // Montar observações sobre correspondente necessário
        let obsCorrespondente = "";
        const uf = extrairUF(aud.numero_processo);
        const equipe = getEquipeCorrespondente(uf);
        if (!advSorteado) obsCorrespondente += `Sem advogado disponível — correspondente necessário (${equipe}). `;
        if (!prepSorteado) obsCorrespondente += `Sem preposto disponível — correspondente necessário (${equipe}). `;

        await supabase
          .from("audiencias")
          .update({
            status: "atribuida",
            advogado: advSorteado?.nome || null,
            preposto: prepSorteado?.nome || null,
            observacoes: obsCorrespondente || null,
          })
          .eq("id", aud.id);

        atribuidas++;
        let motivo = `Sorteado entre ${advDisponiveis.length} advogado(s) e ${prepDisponiveis.length} preposto(s)`;
        if (!advSorteado) motivo = `Sem advogado disponível — correspondente necessário (${equipe}). Preposto: ${prepSorteado?.nome}`;
        if (!prepSorteado) motivo = `Sem preposto disponível — correspondente necessário (${equipe}). Advogado: ${advSorteado?.nome}`;

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
        presenciais: presenciaisCount,
        semDisponivel,
        itens,
      };
      setResultado(res);
      setStatus("concluido");

      // Salvar histórico com semana
      await (supabase.from("historico_sorteios" as any) as any).insert({
        total: res.total,
        atribuidas: res.atribuidas,
        presenciais: res.presenciais,
        sem_disponivel: res.semDisponivel,
        semana_inicio: semanaInicio,
        detalhes: JSON.stringify(res.itens.map((i) => ({
          processo: i.processo,
          advogado: i.advogado?.nome,
          preposto: i.preposto?.nome,
          motivo: i.motivo,
        }))),
      });

      await carregarSemanas();

      toast({ title: "Sorteio realizado!", description: `${atribuidas} audiências atribuídas` });
    } catch (err: any) {
      setStatus("erro");
      toast({ title: "Erro no sorteio", description: err.message, variant: "destructive" });
    }
  };

  return { status, resultado, realizarSorteio, limpar, semanasDisponiveis, carregarSemanas };
}
