import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar, Clock, Users, AlertTriangle, CheckCircle2,
  Link2, MapPin, Pencil, ExternalLink, Building2, Monitor,
  FileText, History, ChevronLeft, ChevronRight, Star, UserCheck
} from "lucide-react";
import { startOfWeek, endOfWeek, format, addDays, addWeeks, isSameWeek, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

interface Audiencia {
  id: string;
  autor: string;
  reu: string;
  data_audiencia: string | null;
  hora_audiencia: string | null;
  tipo_audiencia: string | null;
  local: string | null;
  foro: string | null;
  link: string | null;
  status: string;
  carteira: string | null;
  numero_processo: string | null;
  advogado: string | null;
  preposto: string | null;
  npc_dossie: string | null;
  adv_responsavel: string | null;
}

interface HistoricoSorteio {
  id: string;
  executado_em: string;
  total: number;
  atribuidas: number;
  presenciais: number;
  sem_disponivel: number;
  semana_inicio: string | null;
}

interface Pessoa {
  id: string;
  nome: string;
  tipo: string;
  equipe: string | null;
  ativo: boolean;
}

function isPresencial(aud: Audiencia): boolean {
  const tipo = (aud.tipo_audiencia || "").toLowerCase();
  const local = (aud.local || "").toLowerCase();
  if (tipo.includes("presencial") || local.includes("presencial")) return true;
  if (tipo.includes("online") || tipo.includes("virtual") || tipo.includes("vídeo") || tipo.includes("video") || local.includes("online") || local.includes("virtual")) return false;
  if (aud.link) return false;
  return true;
}

function getPendencias(aud: Audiencia): string[] {
  const pends: string[] = [];
  if (!aud.adv_responsavel) pends.push("Sem advogado");
  if (!aud.preposto) pends.push("Sem preposto");
  if (!isPresencial(aud) && !aud.link) pends.push("Sem link");
  if (isPresencial(aud) && !aud.foro) pends.push("Sem foro");
  const hora = aud.hora_audiencia || "";
  if (!hora || hora === "00:01:00" || hora === "00:00:00") pends.push("Sem horário");
  return pends;
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function PautaAtual() {
  const [audiencias, setAudiencias] = useState<Audiencia[]>([]);
  const [prepostos, setPrepostos] = useState<Pessoa[]>([]);
  const [ultimaDistribuicao, setUltimaDistribuicao] = useState<HistoricoSorteio | null>(null);
  const [editAud, setEditAud] = useState<Audiencia | null>(null);
  const [editForm, setEditForm] = useState<Partial<Audiencia>>({});
  const [saving, setSaving] = useState(false);
  const [semanaAtual, setSemanaAtual] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigningPreposto, setAssigningPreposto] = useState<string | null>(null);

  // On mount: find the latest distribution week, default to current week
  useEffect(() => {
    async function init() {
      const { data } = await supabase
        .from("historico_sorteios")
        .select("semana_inicio")
        .order("executado_em", { ascending: false })
        .limit(1);
      if (data && data.length > 0 && data[0].semana_inicio) {
        setSemanaAtual(startOfWeek(parseISO(data[0].semana_inicio), { weekStartsOn: 0 }));
      } else {
        setSemanaAtual(startOfWeek(new Date(), { weekStartsOn: 0 }));
      }
      setLoading(false);
    }
    init();
  }, []);

  const inicio = useMemo(() => semanaAtual || startOfWeek(new Date(), { weekStartsOn: 0 }), [semanaAtual]);
  const fim = useMemo(() => endOfWeek(inicio, { weekStartsOn: 0 }), [inicio]);
  const inicioStr = useMemo(() => format(inicio, "yyyy-MM-dd"), [inicio]);
  const fimStr = useMemo(() => format(fim, "yyyy-MM-dd"), [fim]);

  const isCurrentWeek = useMemo(() => isSameWeek(new Date(), inicio, { weekStartsOn: 0 }), [inicio]);

  const semanaLabel = useMemo(() => {
    const seg = addDays(inicio, 1);
    const sex = addDays(fim, -1);
    return `${format(seg, "dd/MM", { locale: ptBR })} à ${format(sex, "dd/MM/yyyy", { locale: ptBR })}`;
  }, [inicio, fim]);

  const fetchData = useCallback(async () => {
    const [{ data: auds }, { data: hist }] = await Promise.all([
      supabase
        .from("audiencias")
        .select("id, autor, reu, data_audiencia, hora_audiencia, tipo_audiencia, local, foro, link, status, carteira, numero_processo, advogado, preposto, npc_dossie, adv_responsavel")
        .gte("data_audiencia", inicioStr)
        .lte("data_audiencia", fimStr),
      supabase
        .from("historico_sorteios")
        .select("*")
        .eq("semana_inicio", inicioStr)
        .order("executado_em", { ascending: false })
        .limit(1),
    ]);
    setAudiencias(auds || []);
    setUltimaDistribuicao(hist && hist.length > 0 ? hist[0] : null);
  }, [inicioStr, fimStr]);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("pauta-atual")
      .on("postgres_changes", { event: "*", schema: "public", table: "audiencias" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const totalAudiencias = audiencias.length;
  const completas = audiencias.filter(a => getPendencias(a).length === 0).length;
  const pendentes = totalAudiencias - completas;
  const comPendencias = useMemo(() => audiencias.filter(a => getPendencias(a).length > 0), [audiencias]);

  // Resumo por dia
  const resumoPorDia = useMemo(() => {
    const dias: { data: Date; label: string; total: number; pendentes: number }[] = [];
    for (let i = 1; i <= 5; i++) {
      const dia = addDays(inicio, i);
      const diaStr = format(dia, "yyyy-MM-dd");
      const audsDia = audiencias.filter(a => a.data_audiencia === diaStr);
      const pendDia = audsDia.filter(a => getPendencias(a).length > 0).length;
      dias.push({
        data: dia,
        label: DIAS_SEMANA[i],
        total: audsDia.length,
        pendentes: pendDia,
      });
    }
    return dias;
  }, [audiencias, inicio]);

  const openEdit = (aud: Audiencia) => {
    setEditAud(aud);
    setEditForm({
      npc_dossie: aud.npc_dossie || "",
      autor: aud.autor,
      reu: aud.reu,
      advogado: aud.advogado || "",
      preposto: aud.preposto || "",
      link: aud.link || "",
      foro: aud.foro || "",
      local: aud.local || "",
      numero_processo: aud.numero_processo || "",
      tipo_audiencia: aud.tipo_audiencia || "",
      carteira: aud.carteira || "",
      adv_responsavel: aud.adv_responsavel || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editAud) return;
    setSaving(true);
    const { error } = await supabase.from("audiencias").update({
      npc_dossie: editForm.npc_dossie || null,
      autor: editForm.autor || editAud.autor,
      reu: editForm.reu || editAud.reu,
      advogado: editForm.advogado || null,
      preposto: editForm.preposto || null,
      link: editForm.link || null,
      foro: editForm.foro || null,
      local: editForm.local || null,
      numero_processo: editForm.numero_processo || null,
      tipo_audiencia: editForm.tipo_audiencia || null,
      carteira: editForm.carteira || null,
      adv_responsavel: editForm.adv_responsavel || null,
    }).eq("id", editAud.id);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Audiência atualizada!");
      setEditAud(null);
      fetchData();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Clock className="h-5 w-5 animate-spin mr-2" /> Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with week navigation */}
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Pauta Atual
        </h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setSemanaAtual(s => addWeeks(s!, -1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className={`text-center px-6 py-2 rounded-xl border-2 transition-all ${isCurrentWeek ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
            <p className={`text-lg font-bold ${isCurrentWeek ? "text-primary" : "text-foreground"}`}>{semanaLabel}</p>
            {isCurrentWeek && <Badge className="bg-primary/10 text-primary border-primary/30 text-xs mt-1">Semana atual</Badge>}
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setSemanaAtual(s => addWeeks(s!, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
          {!isCurrentWeek && (
            <Button variant="ghost" size="sm" onClick={() => setSemanaAtual(startOfWeek(new Date(), { weekStartsOn: 0 }))}>
              Ir para semana atual
            </Button>
          )}
        </div>
      </div>

      {/* Última Distribuição */}
      <Card className="border-2 border-primary/20">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <History className="h-5 w-5 text-primary" />
            </div>
            {ultimaDistribuicao ? (
              <div className="flex-1">
                <p className="text-sm font-medium">Última distribuição realizada em</p>
                <p className="text-lg font-bold text-primary">
                  {format(new Date(ultimaDistribuicao.executado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                  <span>{ultimaDistribuicao.total} total</span>
                  <span>{ultimaDistribuicao.atribuidas} atribuídas</span>
                  <span>{ultimaDistribuicao.presenciais} presenciais</span>
                  {ultimaDistribuicao.sem_disponivel > 0 && (
                    <span className="text-amber-600">{ultimaDistribuicao.sem_disponivel} sem disponível</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Nenhuma distribuição realizada nesta semana</p>
                <p className="text-xs text-muted-foreground mt-0.5">Acesse a aba Distribuição para distribuir as audiências</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-3xl font-bold text-primary">{totalAudiencias}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-50 dark:bg-green-950/50 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completas</p>
              <p className="text-3xl font-bold text-green-600">{completas}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${pendentes > 0 ? "bg-amber-50 dark:bg-amber-950/50" : "bg-green-50 dark:bg-green-950/50"}`}>
              <AlertTriangle className={`h-6 w-6 ${pendentes > 0 ? "text-amber-600" : "text-green-600"}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pendentes</p>
              <p className={`text-3xl font-bold ${pendentes > 0 ? "text-amber-600" : "text-green-600"}`}>{pendentes}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo por dia */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resumo por Dia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            {resumoPorDia.map((dia) => (
              <div
                key={dia.label}
                className="rounded-xl border p-4 text-center space-y-1"
              >
                <p className="text-xs text-muted-foreground font-medium">{dia.label}</p>
                <p className="text-sm text-muted-foreground">{format(dia.data, "dd/MM")}</p>
                <p className="text-2xl font-bold">{dia.total}</p>
                {dia.pendentes > 0 ? (
                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                    {dia.pendentes} pend.
                  </Badge>
                ) : dia.total > 0 ? (
                  <Badge className="text-[10px] bg-green-100 text-green-700 border-green-300">OK</Badge>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Pendências */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <CardTitle className="text-base">Audiências com Pendências ({comPendencias.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {comPendencias.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500 opacity-60" />
              <p className="font-medium">Nenhuma pendência encontrada!</p>
              <p className="text-sm mt-1">Todas as audiências da semana estão completas.</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[50vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[90px]">NPC</TableHead>
                    <TableHead>Réu</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Advogado</TableHead>
                    <TableHead>Preposto</TableHead>
                    <TableHead>Pendências</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comPendencias.map((aud) => {
                    const pends = getPendencias(aud);
                    const online = !isPresencial(aud);
                    return (
                      <TableRow key={aud.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(aud)}>
                        <TableCell className="text-sm font-mono font-bold text-primary">
                          {aud.npc_dossie || "—"}
                        </TableCell>
                        <TableCell className="text-sm font-medium max-w-[160px] truncate">
                          {aud.reu || "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {aud.data_audiencia
                            ? format(new Date(aud.data_audiencia + "T00:00:00"), "dd/MM", { locale: ptBR })
                            : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {aud.hora_audiencia && aud.hora_audiencia !== "00:01:00" && aud.hora_audiencia !== "00:00:00"
                            ? aud.hora_audiencia.slice(0, 5)
                            : <span className="text-amber-600">—</span>}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px]">
                            {aud.tipo_audiencia || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {aud.adv_responsavel ? (
                            <span className="text-blue-700 dark:text-blue-300">{aud.adv_responsavel}</span>
                          ) : (
                            <span className="text-amber-600">⚠ Pendente</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {aud.preposto ? (
                            <span className="text-emerald-700 dark:text-emerald-300">{aud.preposto}</span>
                          ) : (
                            <span className="text-amber-600">⚠ Pendente</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {pends.map((p) => (
                              <Badge key={p} variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                                {p}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editAud !== null} onOpenChange={(open) => !open && setEditAud(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Editar Audiência {editForm.npc_dossie ? `— NPC ${editForm.npc_dossie}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>NPC / Dossiê</Label>
                <Input value={editForm.npc_dossie || ""} onChange={(e) => setEditForm((f) => ({ ...f, npc_dossie: e.target.value }))} />
              </div>
              <div>
                <Label>Nº Processo</Label>
                <Input value={editForm.numero_processo || ""} onChange={(e) => setEditForm((f) => ({ ...f, numero_processo: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Autor</Label>
                <Input value={editForm.autor || ""} onChange={(e) => setEditForm((f) => ({ ...f, autor: e.target.value }))} />
              </div>
              <div>
                <Label>Réu</Label>
                <Input value={editForm.reu || ""} onChange={(e) => setEditForm((f) => ({ ...f, reu: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Advogado Responsável</Label>
                <Input value={editForm.adv_responsavel || ""} onChange={(e) => setEditForm((f) => ({ ...f, adv_responsavel: e.target.value }))} />
              </div>
              <div>
                <Label>Preposto</Label>
                <Input value={editForm.preposto || ""} onChange={(e) => setEditForm((f) => ({ ...f, preposto: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Link (audiência online)</Label>
              <Input value={editForm.link || ""} onChange={(e) => setEditForm((f) => ({ ...f, link: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <Label>Foro / Endereço (audiência presencial)</Label>
              <Input value={editForm.foro || ""} onChange={(e) => setEditForm((f) => ({ ...f, foro: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de Audiência</Label>
                <Input value={editForm.tipo_audiencia || ""} onChange={(e) => setEditForm((f) => ({ ...f, tipo_audiencia: e.target.value }))} />
              </div>
              <div>
                <Label>Carteira</Label>
                <Input value={editForm.carteira || ""} onChange={(e) => setEditForm((f) => ({ ...f, carteira: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Local</Label>
              <Input value={editForm.local || ""} onChange={(e) => setEditForm((f) => ({ ...f, local: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditAud(null)}>Cancelar</Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
