import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FileText, Users, Search, Trash2, ExternalLink, Upload, MapPin, Pencil, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import XLSXStyle from "xlsx-js-style";

interface Audiencia {
  id: string;
  numero_processo: string;
  data_audiencia: string;
  hora_audiencia: string;
  autor: string;
  reu: string;
  assunto: string;
  status: string;
  link?: string | null;
  npc_dossie?: string | null;
  tipo_audiencia?: string | null;
  foro?: string | null;
  comarca?: string | null;
  carteira?: string | null;
  local?: string | null;
  advogado?: string | null;
  preposto?: string | null;
  estrategia?: string | null;
  estrategia_smaa?: string | null;
  adv_responsavel?: string | null;
  observacoes?: string | null;
  documentacao?: string | null;
  adv_do_autor?: string | null;
  contato_cartorio?: string | null;
  atribuicoes?: Array<{
    pessoa: {
      id: string;
      nome: string;
      tipo: string;
      documento: string | null;
    };
  }>;
}

const HEADER_MAP: Record<string, string> = {
  "ID": "id",
  "NPC/DOSSIÊ": "npc_dossie",
  "NPC/DOSSIE": "npc_dossie",
  "AUTOR": "autor",
  "PROCESSO": "numero_processo",
  "DATA": "data_audiencia",
  "HORÁRIO": "hora_audiencia",
  "HORARIO": "hora_audiencia",
  "TIPO DA AUDIENCIA": "tipo_audiencia",
  "TIPO DA AUDIÊNCIA": "tipo_audiencia",
  "FORO": "foro",
  "COMARCA": "comarca",
  "ASSUNTO": "assunto",
  "CARTEIRA": "carteira",
  "STATUS": "status",
  "LOCAL": "local",
  "ADVOGADO": "advogado",
  "PREPOSTO": "preposto",
  "ESTRATÉGIA": "estrategia",
  "ESTRATEGIA": "estrategia",
  "ESTRATÉGIA SMAA": "estrategia_smaa",
  "ESTRATEGIA SMAA": "estrategia_smaa",
  "CLIENTE (RÉU)": "reu",
  "CLIENTE (REU)": "reu",
  "ADV RESPONSAVEL": "adv_responsavel",
  "ADV RESPONSÁVEL": "adv_responsavel",
  "OBSERVAÇÕES": "observacoes",
  "OBSERVACOES": "observacoes",
  "DOCUMENTAÇÃO": "documentacao",
  "DOCUMENTACAO": "documentacao",
  "LINK": "link",
  "ADV DO AUTOR": "adv_do_autor",
  "CONTATO CARTORIO": "contato_cartorio",
  "CONTATO CARTÓRIO": "contato_cartorio",
};

const CODIGO_ESTADO: Record<string, string> = {
  "8.01": "AC", "8.02": "AL", "8.03": "AP", "8.04": "AM", "8.05": "BA",
  "8.06": "CE", "8.07": "DF", "8.08": "ES", "8.09": "GO", "8.10": "MA",
  "8.11": "MT", "8.12": "MS", "8.13": "MG", "8.14": "PA", "8.15": "PB",
  "8.16": "PR", "8.17": "PE", "8.18": "PI", "8.19": "RJ", "8.20": "RN",
  "8.21": "RS", "8.22": "RO", "8.23": "RR", "8.24": "SC", "8.25": "SE",
  "8.26": "SP", "8.27": "TO",
};

function isPresencial(audiencia: { tipo_audiencia?: string | null; local?: string | null }): boolean {
  const tipo = (audiencia.tipo_audiencia || "").toLowerCase();
  const local = (audiencia.local || "").toLowerCase();
  return tipo.includes("presencial") || local.includes("presencial");
}

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

function parseExcelDate(value: any): string | null {
  if (!value) return null;
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      const m = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${date.y}-${m}-${d}`;
    }
  }
  const s = String(value).trim();
  if (/^\d+$/.test(s) && Number(s) > 1000) {
    const date = XLSX.SSF.parse_date_code(Number(s));
    if (date) {
      const m = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${date.y}-${m}-${d}`;
    }
  }
  const match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s || null;
}

function parseExcelTime(value: any): string | null {
  if (!value) return null;
  if (typeof value === "number") {
    const totalSeconds = Math.round(value * 86400);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  const s = String(value).trim();
  if (/^\d*\.\d+$/.test(s)) {
    const totalSeconds = Math.round(Number(s) * 86400);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  const match = s.match(/(\d{1,2}):(\d{2})/);
  if (match) return `${match[1].padStart(2, "0")}:${match[2]}`;
  return s || null;
}

const AudienciasList = () => {
  const [audiencias, setAudiencias] = useState<Audiencia[]>([]);
  const [filteredAudiencias, setFilteredAudiencias] = useState<Audiencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchNome, setSearchNome] = useState("");
  const [searchDoc, setSearchDoc] = useState("");
  const [importing, setImporting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingRows, setPendingRows] = useState<any[]>([]);
  const [editAudiencia, setEditAudiencia] = useState<Audiencia | null>(null);
  const [editAudData, setEditAudData] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      
      const audienciasWithPessoas = await Promise.all(
        (data || []).map(async (aud: any) => {
          let atribuicoesArray = aud.atribuicoes;
          if (atribuicoesArray && !Array.isArray(atribuicoesArray)) {
            atribuicoesArray = [atribuicoesArray];
          }
          
          if (atribuicoesArray?.length > 0) {
            const pessoaIds = atribuicoesArray.map((atr: any) => atr.pessoa?.id).filter(Boolean);
            if (pessoaIds.length > 0) {
              const { data: pessoasData } = await supabase
                .from("pessoas")
                .select("id, nome, tipo, documento")
                .in("id", pessoaIds);
              
              return {
                ...aud,
                atribuicoes: atribuicoesArray.map((atr: any) => ({
                  ...atr,
                  pessoa: pessoasData?.find((p) => p.id === atr.pessoa?.id) || atr.pessoa,
                })),
              };
            }
          }
          return { ...aud, atribuicoes: atribuicoesArray || [] };
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (jsonData.length === 0) {
        toast({ variant: "destructive", title: "Planilha vazia", description: "Nenhuma linha encontrada." });
        return;
      }

      const headers = Object.keys(jsonData[0] as any);
      const mapped = jsonData.map((row: any) => {
        const obj: any = {};
        headers.forEach((h) => {
          const key = HEADER_MAP[h.toUpperCase().trim()];
          if (key && key !== "id") {
            obj[key] = row[h] !== undefined && row[h] !== "" ? String(row[h]) : null;
          }
        });
        if (obj.data_audiencia) obj.data_audiencia = parseExcelDate(obj.data_audiencia);
        if (obj.hora_audiencia) obj.hora_audiencia = parseExcelTime(obj.hora_audiencia);
        const ALLOWED_STATUSES = ['pendente', 'atribuida', 'realizada'];
        const rawStatus = (obj.status || '').toString().toLowerCase().trim();
        obj.status = ALLOWED_STATUSES.includes(rawStatus) ? rawStatus : 'pendente';
        if (!obj.autor) obj.autor = "";
        if (!obj.reu) obj.reu = "";
        return obj;
      });

      setPendingRows(mapped);
      setShowConfirm(true);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao ler planilha", description: err.message });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConfirmImport = async () => {
    setShowConfirm(false);
    setImporting(true);
    try {
      await supabase.from("atribuicoes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("audiencias").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      const batchSize = 100;
      let inserted = 0;
      for (let i = 0; i < pendingRows.length; i += batchSize) {
        const batch = pendingRows.slice(i, i + batchSize);
        const { error } = await supabase.from("audiencias").insert(batch as any);
        if (error) throw error;
        inserted += batch.length;
      }

      // === SORTEIO AUTOMÁTICO PÓS-IMPORTAÇÃO ===
      const { data: audienciasImportadas, error: fetchErr } = await supabase
        .from("audiencias")
        .select("*")
        .eq("status", "pendente");
      if (fetchErr) throw fetchErr;

      const { data: pessoas, error: pessoasErr } = await supabase
        .from("pessoas")
        .select("*")
        .eq("ativo", true);
      if (pessoasErr) throw pessoasErr;

      const advogados = pessoas?.filter((p) => p.tipo === "advogado") || [];
      const prepostos = pessoas?.filter((p) => p.tipo === "preposto") || [];

      const hoje = new Date();
      const diaSemana = hoje.getDay();
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - diaSemana);
      inicioSemana.setHours(0, 0, 0, 0);
      const semanaInicioStr = inicioSemana.toISOString().split("T")[0];

      const contagemPorPessoa = new Map<string, number>();

      const atribuicoes: Array<{ audiencia_id: string; pessoa_id: string; semana_inicio: string }> = [];
      const audienciasPresenciais: Array<{ id: string; observacoes: string }> = [];
      const audienciasAtribuidas: string[] = [];
      let presenciaisCount = 0;

      for (const audiencia of (audienciasImportadas || [])) {
        if (isPresencial(audiencia)) {
          presenciaisCount++;
          const uf = extrairUF(audiencia.numero_processo);
          const equipe = getEquipeCorrespondente(uf);
          const ufLabel = uf ? ` (${uf})` : "";
          const obs = `⚠️ PRESENCIAL${ufLabel} - Contatar ${equipe} para contratação de correspondente`;
          audienciasPresenciais.push({ id: audiencia.id, observacoes: obs });
        } else {
          // Regra de equipe: filtrar por carteira
          const carteiraAudiencia = (audiencia.carteira || "").trim().toUpperCase();
          
          const advDisponiveis = advogados.filter((p) => {
            const equipe = ((p as any).equipe || "").trim().toUpperCase();
            if (!carteiraAudiencia || !equipe) return true;
            return equipe === carteiraAudiencia;
          }).filter((p) => (contagemPorPessoa.get(p.id) || 0) < 2);

          const prepDisponiveis = prepostos.filter((p) => {
            const equipe = ((p as any).equipe || "").trim().toUpperCase();
            if (!carteiraAudiencia || !equipe) return true;
            return equipe === carteiraAudiencia;
          }).filter((p) => (contagemPorPessoa.get(p.id) || 0) < 2);

          if (advDisponiveis.length > 0 && prepDisponiveis.length > 0) {
            const advSorteado = advDisponiveis[Math.floor(Math.random() * advDisponiveis.length)];
            const prepSorteado = prepDisponiveis[Math.floor(Math.random() * prepDisponiveis.length)];

            atribuicoes.push(
              { audiencia_id: audiencia.id, pessoa_id: advSorteado.id, semana_inicio: semanaInicioStr },
              { audiencia_id: audiencia.id, pessoa_id: prepSorteado.id, semana_inicio: semanaInicioStr }
            );
            audienciasAtribuidas.push(audiencia.id);

            contagemPorPessoa.set(advSorteado.id, (contagemPorPessoa.get(advSorteado.id) || 0) + 1);
            contagemPorPessoa.set(prepSorteado.id, (contagemPorPessoa.get(prepSorteado.id) || 0) + 1);
          }
        }
      }

      if (atribuicoes.length > 0) {
        const { error: insertErr } = await supabase.from("atribuicoes").insert(atribuicoes);
        if (insertErr) throw insertErr;
      }

      if (audienciasAtribuidas.length > 0) {
        const { error: updateErr } = await supabase
          .from("audiencias")
          .update({ status: "atribuida" })
          .in("id", audienciasAtribuidas);
        if (updateErr) throw updateErr;
      }

      for (const ap of audienciasPresenciais) {
        await supabase
          .from("audiencias")
          .update({ observacoes: ap.observacoes })
          .eq("id", ap.id);
      }

      const msgs: string[] = [`${inserted} audiências importadas.`];
      if (audienciasAtribuidas.length > 0) msgs.push(`${audienciasAtribuidas.length} sorteadas (advogado + preposto).`);
      if (presenciaisCount > 0) msgs.push(`${presenciaisCount} presenciais (correspondente).`);

      toast({ title: "Importação e sorteio concluídos", description: msgs.join(" ") });
      setPendingRows([]);
      fetchAudiencias();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro na importação", description: err.message });
    } finally {
      setImporting(false);
    }
  };

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
      await supabase.from("atribuicoes").delete().eq("audiencia_id", id);
      
      const { error } = await supabase
        .from("audiencias")
        .delete()
        .eq("id", id);
      if (error) throw error;

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


  const openEditAudiencia = (aud: Audiencia) => {
    setEditAudiencia(aud);
    setEditAudData({
      numero_processo: aud.numero_processo || "",
      data_audiencia: aud.data_audiencia || "",
      hora_audiencia: aud.hora_audiencia || "",
      autor: aud.autor || "",
      reu: aud.reu || "",
      assunto: aud.assunto || "",
      link: aud.link || "",
      tipo_audiencia: aud.tipo_audiencia || "",
      local: aud.local || "",
      observacoes: aud.observacoes || "",
      carteira: aud.carteira || "",
      foro: aud.foro || "",
      comarca: aud.comarca || "",
      npc_dossie: aud.npc_dossie || "",
      advogado: aud.advogado || "",
      preposto: aud.preposto || "",
      estrategia: aud.estrategia || "",
      estrategia_smaa: aud.estrategia_smaa || "",
      adv_responsavel: aud.adv_responsavel || "",
      adv_do_autor: aud.adv_do_autor || "",
      contato_cartorio: aud.contato_cartorio || "",
      documentacao: aud.documentacao || "",
    });
  };

  const handleSaveEditAudiencia = async () => {
    if (!editAudiencia) return;
    setSavingEdit(true);
    try {
      const updateData: any = {};
      Object.entries(editAudData).forEach(([key, value]) => {
        updateData[key] = value || null;
      });
      // Keep required fields non-null
      updateData.autor = editAudData.autor || "";
      updateData.reu = editAudData.reu || "";

      const { error } = await supabase
        .from("audiencias")
        .update(updateData)
        .eq("id", editAudiencia.id);

      if (error) throw error;

      toast({ title: "Audiência atualizada com sucesso" });
      setEditAudiencia(null);
      fetchAudiencias();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao atualizar audiência", description: error.message });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleExportarPlanilha = () => {
    const headers = [
      "NPC/DOSSIÊ", "Autor", "Processo", "Data", "Horário", "Tipo da Audiência",
      "Foro", "Comarca", "Assunto", "Carteira", "Status", "Local",
      "Advogado (Original)", "Preposto (Original)", "Estratégia", "Estratégia SMAA",
      "Cliente (Réu)", "Adv Responsável", "Observações", "Documentação", "Link",
      "Adv do Autor", "Contato Cartório", "Advogado Atribuído", "Preposto Atribuído"
    ];

    const rows = filteredAudiencias.map((aud) => {
      const advAtribuido = aud.atribuicoes?.find((a: any) => a.pessoa?.tipo === "advogado")?.pessoa?.nome || "";
      const prepAtribuido = aud.atribuicoes?.find((a: any) => a.pessoa?.tipo === "preposto")?.pessoa?.nome || "";

      return [
        aud.npc_dossie || "",
        aud.autor || "",
        aud.numero_processo || "",
        aud.data_audiencia || "",
        aud.hora_audiencia || "",
        aud.tipo_audiencia || "",
        aud.foro || "",
        aud.comarca || "",
        aud.assunto || "",
        aud.carteira || "",
        aud.status || "",
        aud.local || "",
        aud.advogado || "",
        aud.preposto || "",
        aud.estrategia || "",
        aud.estrategia_smaa || "",
        aud.reu || "",
        aud.adv_responsavel || "",
        aud.observacoes || "",
        aud.documentacao || "",
        aud.link || "",
        aud.adv_do_autor || "",
        aud.contato_cartorio || "",
        advAtribuido,
        prepAtribuido,
      ];
    });

    const wsData = [headers, ...rows];
    const ws = XLSXStyle.utils.aoa_to_sheet(wsData);

    // Style header row bold
    headers.forEach((_, colIdx) => {
      const cellRef = XLSXStyle.utils.encode_cell({ r: 0, c: colIdx });
      if (ws[cellRef]) {
        ws[cellRef].s = { font: { bold: true } };
      }
    });

    // Highlight yellow cells where there's correspondent info (presencial)
    const obsColIdx = headers.indexOf("Observações");
    filteredAudiencias.forEach((aud, rowIdx) => {
      const isCorrespondente = isPresencial(aud) || (aud.observacoes || "").includes("correspondente");
      if (isCorrespondente) {
        // Highlight the entire row's "Observações" cell yellow
        const cellRef = XLSXStyle.utils.encode_cell({ r: rowIdx + 1, c: obsColIdx });
        if (ws[cellRef]) {
          ws[cellRef].s = {
            fill: { fgColor: { rgb: "FFFF00" } },
          };
        }
      }
    });

    // Auto column widths
    ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 2, 15) }));

    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, "Audiências");
    XLSXStyle.writeFile(wb, `audiencias_${format(new Date(), "yyyy-MM-dd")}.xlsx`);

    toast({ title: "Planilha exportada com sucesso!" });
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
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExportarPlanilha}
            disabled={filteredAudiencias.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Extrair Planilha
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <Upload className="h-4 w-4 mr-2" />
            {importing ? "Importando..." : "Importar Planilha"}
          </Button>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {filteredAudiencias.length} audiências
          </Badge>
        </div>
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
              Cadastre a primeira audiência na aba "Nova Audiência" ou importe uma planilha.
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
                      {audiencia.numero_processo || "Sem processo"}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      {audiencia.data_audiencia && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(audiencia.data_audiencia + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                      {audiencia.hora_audiencia && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {audiencia.hora_audiencia}
                        </span>
                      )}
                      {audiencia.tipo_audiencia && (
                        <Badge variant="secondary">{audiencia.tipo_audiencia}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(audiencia.status)}
                    <Button variant="ghost" size="icon" onClick={() => openEditAudiencia(audiencia)}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {audiencia.autor && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Autor</p>
                      <p className="text-sm text-muted-foreground">{audiencia.autor}</p>
                    </div>
                  )}
                  {audiencia.reu && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Réu</p>
                      <p className="text-sm text-muted-foreground">{audiencia.reu}</p>
                    </div>
                  )}
                  {audiencia.assunto && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Assunto</p>
                      <p className="text-sm text-muted-foreground">{audiencia.assunto}</p>
                    </div>
                  )}
                  {audiencia.npc_dossie && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">NPC/Dossiê</p>
                      <p className="text-sm text-muted-foreground">{audiencia.npc_dossie}</p>
                    </div>
                  )}
                  {audiencia.foro && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Foro</p>
                      <p className="text-sm text-muted-foreground">{audiencia.foro}</p>
                    </div>
                  )}
                  {audiencia.comarca && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Comarca</p>
                      <p className="text-sm text-muted-foreground">{audiencia.comarca}</p>
                    </div>
                  )}
                  {audiencia.carteira && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Carteira</p>
                      <p className="text-sm text-muted-foreground">{audiencia.carteira}</p>
                    </div>
                  )}
                  {audiencia.local && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Local</p>
                      <p className="text-sm text-muted-foreground">{audiencia.local}</p>
                    </div>
                  )}
                  {audiencia.advogado && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Advogado</p>
                      <p className="text-sm text-muted-foreground">{audiencia.advogado}</p>
                    </div>
                  )}
                  {audiencia.preposto && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Preposto</p>
                      <p className="text-sm text-muted-foreground">{audiencia.preposto}</p>
                    </div>
                  )}
                  {audiencia.adv_responsavel && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Adv. Responsável</p>
                      <p className="text-sm text-muted-foreground">{audiencia.adv_responsavel}</p>
                    </div>
                  )}
                  {audiencia.adv_do_autor && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Adv. do Autor</p>
                      <p className="text-sm text-muted-foreground">{audiencia.adv_do_autor}</p>
                    </div>
                  )}
                  {audiencia.estrategia && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Estratégia</p>
                      <p className="text-sm text-muted-foreground">{audiencia.estrategia}</p>
                    </div>
                  )}
                  {audiencia.estrategia_smaa && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Estratégia SMAA</p>
                      <p className="text-sm text-muted-foreground">{audiencia.estrategia_smaa}</p>
                    </div>
                  )}
                  {audiencia.contato_cartorio && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Contato Cartório</p>
                      <p className="text-sm text-muted-foreground">{audiencia.contato_cartorio}</p>
                    </div>
                  )}
                </div>
                {audiencia.observacoes && audiencia.observacoes.includes("PRESENCIAL") && (
                  <div className="pt-2 border-t">
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-100 border border-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-600">
                      <MapPin className="h-4 w-4 text-yellow-700 dark:text-yellow-400 mt-0.5 shrink-0" />
                      <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">{audiencia.observacoes}</p>
                    </div>
                  </div>
                )}
                {((audiencia.observacoes && !audiencia.observacoes.includes("PRESENCIAL")) || audiencia.documentacao) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
                    {audiencia.observacoes && !audiencia.observacoes.includes("PRESENCIAL") && (
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">Observações</p>
                        <p className="text-sm text-muted-foreground">{audiencia.observacoes}</p>
                      </div>
                    )}
                    {audiencia.documentacao && (
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">Documentação</p>
                        <p className="text-sm text-muted-foreground">{audiencia.documentacao}</p>
                      </div>
                    )}
                  </div>
                )}
                {audiencia.atribuicoes && audiencia.atribuicoes.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Atribuído a:
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {[...audiencia.atribuicoes]
                        .sort((a: any, b: any) => {
                          if (a.pessoa?.tipo === 'advogado') return -1;
                          if (b.pessoa?.tipo === 'advogado') return 1;
                          return 0;
                        })
                        .map((atr: any, idx: number) => (
                        <div key={idx} className="flex flex-col gap-1 p-2 bg-muted/50 rounded-md">
                          <Badge 
                            variant={atr.pessoa?.tipo === 'advogado' ? 'default' : 'secondary'}
                            className="justify-center"
                          >
                            {atr.pessoa?.tipo === 'advogado' ? 'ADVOGADO' : 'PREPOSTO'}
                          </Badge>
                          <span className="text-sm font-medium text-foreground">
                            {atr.pessoa?.nome}
                          </span>
                          {atr.pessoa?.documento && (
                            <span className="text-xs text-muted-foreground">
                              {atr.pessoa?.tipo === 'advogado' ? 'OAB' : 'CPF'}: {atr.pessoa?.documento}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {audiencia.link && (
                  <div className="pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(audiencia.link!, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir Link da Audiência
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar importação</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá <strong>excluir todas as audiências e atribuições existentes</strong> e importar{" "}
              <strong>{pendingRows.length}</strong> novas audiências da planilha. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport}>
              Importar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de edição de audiência */}
      <Dialog open={!!editAudiencia} onOpenChange={(open) => !open && setEditAudiencia(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Audiência</DialogTitle>
            <DialogDescription>Altere os dados da audiência e salve.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nº Processo</Label>
              <Input value={editAudData.numero_processo || ""} onChange={(e) => setEditAudData({ ...editAudData, numero_processo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={editAudData.data_audiencia || ""} onChange={(e) => setEditAudData({ ...editAudData, data_audiencia: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Input type="time" value={editAudData.hora_audiencia || ""} onChange={(e) => setEditAudData({ ...editAudData, hora_audiencia: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Audiência</Label>
              <Input value={editAudData.tipo_audiencia || ""} onChange={(e) => setEditAudData({ ...editAudData, tipo_audiencia: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Autor</Label>
              <Input value={editAudData.autor || ""} onChange={(e) => setEditAudData({ ...editAudData, autor: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Réu</Label>
              <Input value={editAudData.reu || ""} onChange={(e) => setEditAudData({ ...editAudData, reu: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Carteira</Label>
              <Input value={editAudData.carteira || ""} onChange={(e) => setEditAudData({ ...editAudData, carteira: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Foro</Label>
              <Input value={editAudData.foro || ""} onChange={(e) => setEditAudData({ ...editAudData, foro: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Comarca</Label>
              <Input value={editAudData.comarca || ""} onChange={(e) => setEditAudData({ ...editAudData, comarca: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Local</Label>
              <Input value={editAudData.local || ""} onChange={(e) => setEditAudData({ ...editAudData, local: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>NPC/Dossiê</Label>
              <Input value={editAudData.npc_dossie || ""} onChange={(e) => setEditAudData({ ...editAudData, npc_dossie: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Advogado</Label>
              <Input value={editAudData.advogado || ""} onChange={(e) => setEditAudData({ ...editAudData, advogado: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Preposto</Label>
              <Input value={editAudData.preposto || ""} onChange={(e) => setEditAudData({ ...editAudData, preposto: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Adv. Responsável</Label>
              <Input value={editAudData.adv_responsavel || ""} onChange={(e) => setEditAudData({ ...editAudData, adv_responsavel: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Adv. do Autor</Label>
              <Input value={editAudData.adv_do_autor || ""} onChange={(e) => setEditAudData({ ...editAudData, adv_do_autor: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Contato Cartório</Label>
              <Input value={editAudData.contato_cartorio || ""} onChange={(e) => setEditAudData({ ...editAudData, contato_cartorio: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Link</Label>
              <Input value={editAudData.link || ""} onChange={(e) => setEditAudData({ ...editAudData, link: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Assunto</Label>
              <Input value={editAudData.assunto || ""} onChange={(e) => setEditAudData({ ...editAudData, assunto: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Estratégia</Label>
              <Textarea value={editAudData.estrategia || ""} onChange={(e) => setEditAudData({ ...editAudData, estrategia: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Estratégia SMAA</Label>
              <Textarea value={editAudData.estrategia_smaa || ""} onChange={(e) => setEditAudData({ ...editAudData, estrategia_smaa: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Observações</Label>
              <Textarea value={editAudData.observacoes || ""} onChange={(e) => setEditAudData({ ...editAudData, observacoes: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Documentação</Label>
              <Textarea value={editAudData.documentacao || ""} onChange={(e) => setEditAudData({ ...editAudData, documentacao: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAudiencia(null)}>Cancelar</Button>
            <Button onClick={handleSaveEditAudiencia} disabled={savingEdit}>
              {savingEdit ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AudienciasList;
