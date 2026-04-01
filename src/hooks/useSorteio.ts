import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ─── Helpers ───────────────────────────────────────────────

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function matchCarteiraEquipe(carteira: string | null, equipe: string | null): boolean {
  if (!carteira || !equipe) return true;
  const c = normalize(carteira);
  const e = normalize(equipe);
  if (e === "GERAL") return true;
  const equipes = e.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  return equipes.some(eq => c.includes(eq) || eq.includes(c));
}

// ─── Tipos ─────────────────────────────────────────────────

interface Pessoa {
  id: string;
  nome: string;
  tipo: string;
  equipe: string | null;
  carteira: string | null;
  estado: string | null;
  ativo: boolean;
  observacao: string | null;
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

// ─── Funções utilitárias ───────────────────────────────────

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

// ─── Detecção de cliente a partir do campo réu ─────────────

function detectarCliente(reu: string | null): string | null {
  if (!reu) return null;
  const r = normalize(reu);
  if (r.includes("ITAU") || r.includes("BMG")) return "ITAÚ";
  if (r.includes("VIVO") || r.includes("TELEFONICA")) return "VIVO";
  if (r.includes("BRADESCO")) return "BRADESCO";
  if (r.includes("MELI") || r.includes("MERCADO LIVRE") || r.includes("MERCADOLIVRE")) return "MELI";
  if (r.includes("ELETROBR")) return "ELETROBRÁS";
  if (r.includes("HEMERA")) return "HEMERA";
  return null;
}

// ─── Verificação SE (Superendividamento) ───────────────────

function isAudienciaSE(carteira: string | null): boolean {
  if (!carteira) return false;
  const c = normalize(carteira);
  return c.includes("SUPERENDIVIDADO") || c.includes("SUPERENDIVIDAMENTO");
}

function advogadoFazSE(pessoa: Pessoa): boolean {
  return normalize(pessoa.observacao || "").includes("FAZ SE") &&
    !normalize(pessoa.observacao || "").includes("NAO FAZ SE");
}

// ─── Match de carteira para ITAU (pessoa.carteira vs audiencia.carteira) ──

function matchCarteiraItau(audienciaCarteira: string | null, pessoaCarteira: string | null): boolean {
  if (!audienciaCarteira || !pessoaCarteira) return false;
  const ac = normalize(audienciaCarteira);
  const pc = normalize(pessoaCarteira);
  // Exact or partial match
  if (ac === pc) return true;
  if (ac.includes(pc) || pc.includes(ac)) return true;
  // Special mappings
  if (ac.includes("DCR") && pc.includes("DCR")) return true;
  if (ac.includes("CREDICARD") && (pc.includes("CARTOES") || pc.includes("CREDICARD"))) return true;
  if (ac.includes("SUPERENDIVIDADO") && pc.includes("SUPERENDIVIDAMENTO")) return true;
  if (ac.includes("JV") && pc.includes("JV")) return true;
  return false;
}

// ─── Verificação se pessoa pertence a um cliente ───────────

function pessoaPertenceCliente(pessoa: Pessoa, cliente: string): boolean {
  if (!pessoa.equipe) return false;
  const equipes = pessoa.equipe.split(/[,;]/).map(s => normalize(s.trim())).filter(Boolean);
  const cn = normalize(cliente);
  return equipes.some(eq => eq === cn || eq.includes(cn) || cn.includes(eq));
}

function pessoaTemCarteiraGeral(pessoa: Pessoa): boolean {
  if (!pessoa.carteira) return false;
  const carteiras = pessoa.carteira.split(/[,;]/).map(s => normalize(s.trim())).filter(Boolean);
  return carteiras.includes("GERAL");
}

// ─── Seleção por prioridade ────────────────────────────────

function selecionarPorPrioridade(
  candidatos: Pessoa[],
  contagemSemanal: Record<string, number>,
): Pessoa | null {
  if (candidatos.length === 0) return null;
  // Prefer the one with fewest assignments for balance
  const minContagem = Math.min(...candidatos.map(c => contagemSemanal[c.id] || 0));
  const melhores = candidatos.filter(c => (contagemSemanal[c.id] || 0) === minContagem);
  return melhores[Math.floor(Math.random() * melhores.length)];
}

function filtrarAdvogadosPorPrioridade(
  advogados: Pessoa[],
  audiencia: { reu: string; carteira: string | null },
  contagemSemanal: Record<string, number>,
  isSE: boolean,
): { advogado: Pessoa | null; motivo: string } {
  // Base filter: SE restriction
  let elegíveis = isSE
    ? advogados.filter(a => advogadoFazSE(a))
    : advogados;

  if (elegíveis.length === 0) {
    return { advogado: null, motivo: isSE ? "Nenhum advogado habilitado para SE disponível" : "Nenhum advogado disponível" };
  }

  const cliente = detectarCliente(audiencia.reu);

  if (cliente) {
    const isItau = normalize(cliente).includes("ITAU");

    // Tier 1: Same client (+ carteira match for ITAU)
    if (isItau) {
      const tier1 = elegíveis.filter(a =>
        pessoaPertenceCliente(a, cliente) &&
        matchCarteiraItau(audiencia.carteira, a.carteira)
      );
      if (tier1.length > 0) {
        return {
          advogado: selecionarPorPrioridade(tier1, contagemSemanal),
          motivo: `Prioridade: cliente ITAÚ + carteira "${audiencia.carteira}" (${tier1.length} disponíveis)`,
        };
      }
    }

    // Tier 2: Same client (any carteira)
    const tier2 = elegíveis.filter(a => pessoaPertenceCliente(a, cliente));
    if (tier2.length > 0) {
      return {
        advogado: selecionarPorPrioridade(tier2, contagemSemanal),
        motivo: `Prioridade: cliente ${cliente} (${tier2.length} disponíveis)`,
      };
    }
  }

  // Tier 3: GERAL fallback
  const tier3 = elegíveis.filter(a => pessoaTemCarteiraGeral(a));
  if (tier3.length > 0) {
    return {
      advogado: selecionarPorPrioridade(tier3, contagemSemanal),
      motivo: `Redistribuição GERAL (${tier3.length} disponíveis)`,
    };
  }

  // Tier 4: Any eligible
  return {
    advogado: selecionarPorPrioridade(elegíveis, contagemSemanal),
    motivo: `Distribuição livre (${elegíveis.length} disponíveis)`,
  };
}

// ─── Hook principal ────────────────────────────────────────

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
    const { data: audiencias } = await supabase
      .from("audiencias")
      .select("data_audiencia")
      .eq("status", "pendente")
      .not("data_audiencia", "is", null);

    if (!audiencias || audiencias.length === 0) {
      setSemanasDisponiveis([]);
      return;
    }

    const semanasMap: Record<string, number> = {};
    for (const aud of audiencias) {
      if (!aud.data_audiencia) continue;
      const inicio = getInicioSemana(aud.data_audiencia);
      semanasMap[inicio] = (semanasMap[inicio] || 0) + 1;
    }

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
        sorteada: false,
        dataSorteio: sorteioMap[inicio] || undefined,
      }))
      .sort((a, b) => a.inicio.localeCompare(b.inicio));

    setSemanasDisponiveis(semanas);
  };

  const realizarSorteio = async (semanaInicio: string) => {
    setStatus("executando");
    const semanaFim = getFimSemana(semanaInicio);

    try {
      // Buscar audiências pendentes da semana
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

      // Buscar afastamentos
      const { data: afastamentos } = await supabase
        .from("afastamentos")
        .select("*")
        .lte("data_inicio", semanaFim)
        .gte("data_fim", semanaInicio);

      const afastamentosAtivos = afastamentos || [];

      const pessoaDisponivel = (pessoaId: string, dataAudiencia: string, horaAudiencia: string | null) => {
        const afasts = afastamentosAtivos.filter((a: any) => a.pessoa_id === pessoaId);
        for (const af of afasts) {
          if (dataAudiencia >= af.data_inicio && dataAudiencia <= af.data_fim) {
            if (af.tipo === "ferias") return false;
            if (af.tipo === "provas" && horaAudiencia && af.horario_especial_inicio && af.horario_especial_fim) {
              if (horaAudiencia < af.horario_especial_inicio || horaAudiencia > af.horario_especial_fim) {
                return false;
              }
            }
          }
        }
        return true;
      };

      const todosAdvogados = (pessoas || []).filter((p) => p.tipo === "advogado") as Pessoa[];
      const todosPrepostos = (pessoas || []).filter((p) => p.tipo === "preposto") as Pessoa[];

      // Contagem semanal
      const { data: atribuicoes } = await supabase
        .from("atribuicoes")
        .select("*")
        .eq("semana_inicio", semanaInicio);

      const contagemSemanal: Record<string, number> = {};
      (atribuicoes || []).forEach((a: any) => {
        contagemSemanal[a.pessoa_id] = (contagemSemanal[a.pessoa_id] || 0) + 1;
      });

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

        // ── Presencial ou fora do expediente → correspondente ──
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

        // ── Filtrar disponíveis (afastamento + limite semanal) ──
        const advDisponiveis = todosAdvogados.filter((a) => {
          if (!pessoaDisponivel(a.id, diaAudiencia, horaAud)) return false;
          if ((contagemSemanal[a.id] || 0) >= LIMITE_SEMANAL) return false;
          return true;
        });

        const prepDisponiveis = todosPrepostos.filter((p) => {
          if (!pessoaDisponivel(p.id, diaAudiencia, horaAud)) return false;
          if ((contagemSemanal[p.id] || 0) >= LIMITE_SEMANAL) return false;
          return matchCarteiraEquipe(aud.carteira, p.equipe);
        });

        const isSE = isAudienciaSE(aud.carteira);

        // ── Sem ninguém disponível ──
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

        // ── Selecionar advogado por prioridade ──
        const { advogado: advSorteado, motivo: motivoAdv } = filtrarAdvogadosPorPrioridade(
          advDisponiveis,
          { reu: aud.reu, carteira: aud.carteira },
          contagemSemanal,
          isSE,
        );

        // ── Selecionar preposto (lógica existente) ──
        const prepSorteado = prepDisponiveis.length > 0
          ? selecionarPorPrioridade(prepDisponiveis, contagemSemanal)
          : null;

        if (advSorteado) addContagem(advSorteado.id);
        if (prepSorteado) addContagem(prepSorteado.id);

        // Salvar atribuições
        const atribBatch: { audiencia_id: string; pessoa_id: string; semana_inicio: string }[] = [];
        if (advSorteado) atribBatch.push({ audiencia_id: aud.id, pessoa_id: advSorteado.id, semana_inicio: semanaInicio });
        if (prepSorteado) atribBatch.push({ audiencia_id: aud.id, pessoa_id: prepSorteado.id, semana_inicio: semanaInicio });
        if (atribBatch.length > 0) await supabase.from("atribuicoes").insert(atribBatch);

        // Observações sobre correspondente
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

        let motivo = motivoAdv;
        if (!advSorteado) motivo = `Sem advogado${isSE ? " habilitado para SE" : ""} — correspondente (${equipe}). Preposto: ${prepSorteado?.nome || "N/A"}`;
        if (!prepSorteado && advSorteado) motivo += ` | Sem preposto — correspondente (${equipe})`;

        itens.push({
          audienciaId: aud.id,
          processo: aud.numero_processo || aud.autor,
          carteira: aud.carteira,
          presencial: false,
          advogado: advSorteado,
          preposto: prepSorteado,
          motivo,
          equipeRecomendada: (!advSorteado || !prepSorteado) ? equipe : undefined,
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

      // Salvar histórico
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
