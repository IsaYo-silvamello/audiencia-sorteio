import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FileText, Users, Search, Trash2, ExternalLink, Upload, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";

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
  return "Equipe Thiago"; // SP, Região Sul, demais estados
}

function parseExcelDate(value: any): string | null {
  if (!value) return null;
  // Excel serial number (numeric)
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      const m = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${date.y}-${m}-${d}`;
    }
  }
  const s = String(value).trim();
  // Excel serial number as string (e.g. "46097")
  if (/^\d+$/.test(s) && Number(s) > 1000) {
    const date = XLSX.SSF.parse_date_code(Number(s));
    if (date) {
      const m = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${date.y}-${m}-${d}`;
    }
  }
  // dd/mm/yyyy
  const match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  // yyyy-mm-dd
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
  // Decimal string representing time fraction (e.g. "0.75" = 18:00)
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

      // Map headers
      const headers = Object.keys(jsonData[0] as any);
      const mapped = jsonData.map((row: any) => {
        const obj: any = {};
        headers.forEach((h) => {
          const key = HEADER_MAP[h.toUpperCase().trim()];
          if (key && key !== "id") {
            obj[key] = row[h] !== undefined && row[h] !== "" ? String(row[h]) : null;
          }
        });
        // Parse date and time
        if (obj.data_audiencia) obj.data_audiencia = parseExcelDate(obj.data_audiencia);
        if (obj.hora_audiencia) obj.hora_audiencia = parseExcelTime(obj.hora_audiencia);
        // Defaults
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
      // Delete all atribuicoes first, then audiencias
      await supabase.from("atribuicoes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("audiencias").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      // Insert in batches of 100
      const batchSize = 100;
      let inserted = 0;
      for (let i = 0; i < pendingRows.length; i += batchSize) {
        const batch = pendingRows.slice(i, i + batchSize);
        const { error } = await supabase.from("audiencias").insert(batch as any);
        if (error) throw error;
        inserted += batch.length;
      }

      // === SORTEIO AUTOMÁTICO PÓS-IMPORTAÇÃO ===
      // Buscar audiências recém-inseridas (todas pendentes)
      const { data: audienciasImportadas, error: fetchErr } = await supabase
        .from("audiencias")
        .select("*")
        .eq("status", "pendente");
      if (fetchErr) throw fetchErr;

      // Buscar pessoas ativas
      const { data: pessoas, error: pessoasErr } = await supabase
        .from("pessoas")
        .select("*")
        .eq("ativo", true);
      if (pessoasErr) throw pessoasErr;

      const advogados = pessoas?.filter((p) => p.tipo === "advogado") || [];
      const prepostos = pessoas?.filter((p) => p.tipo === "preposto") || [];

      // Calcular início da semana
      const hoje = new Date();
      const diaSemana = hoje.getDay();
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - diaSemana);
      inicioSemana.setHours(0, 0, 0, 0);
      const semanaInicioStr = inicioSemana.toISOString().split("T")[0];

      // Contagem de atribuições na semana
      const contagemPorPessoa = new Map<string, number>();

      const atribuicoes: Array<{ audiencia_id: string; pessoa_id: string; semana_inicio: string }> = [];
      const audienciasPresenciais: Array<{ id: string; observacoes: string }> = [];
      const audienciasAtribuidas: string[] = [];
      let presenciaisCount = 0;

      for (const audiencia of (audienciasImportadas || [])) {
        if (isPresencial(audiencia)) {
          // Audiência presencial: não sorteia, marca equipe correspondente
          presenciaisCount++;
          const uf = extrairUF(audiencia.numero_processo);
          const equipe = getEquipeCorrespondente(uf);
          const ufLabel = uf ? ` (${uf})` : "";
          const obs = `⚠️ PRESENCIAL${ufLabel} - Contatar ${equipe} para contratação de correspondente`;
          audienciasPresenciais.push({ id: audiencia.id, observacoes: obs });
        } else {
          // Audiência virtual: sortear advogado + preposto
          const advDisponiveis = advogados.filter(
            (p) => (contagemPorPessoa.get(p.id) || 0) < 2
          );
          const prepDisponiveis = prepostos.filter(
            (p) => (contagemPorPessoa.get(p.id) || 0) < 2
          );

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

      // Inserir atribuições
      if (atribuicoes.length > 0) {
        const { error: insertErr } = await supabase.from("atribuicoes").insert(atribuicoes);
        if (insertErr) throw insertErr;
      }

      // Atualizar status das audiências atribuídas
      if (audienciasAtribuidas.length > 0) {
        const { error: updateErr } = await supabase
          .from("audiencias")
          .update({ status: "atribuida" })
          .in("id", audienciasAtribuidas);
        if (updateErr) throw updateErr;
      }

      // Atualizar observações das audiências presenciais
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
        <div className="flex items-center gap-3">
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
                {(audiencia.observacoes || audiencia.documentacao) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
                    {audiencia.observacoes && (
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
    </div>
  );
};

export default AudienciasList;
