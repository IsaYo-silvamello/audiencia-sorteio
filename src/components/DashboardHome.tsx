import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Calendar, Clock, Users, ChevronLeft, ChevronRight,
  Video, Gavel, ShieldAlert, Link2, Building2, MapPin,
  CheckCircle2, AlertTriangle, Lock, Pencil, Monitor, ExternalLink
} from "lucide-react";
import { startOfWeek, endOfWeek, addWeeks, format, isSameWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

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
}

interface PautaSemanal {
  id: string;
  semana_inicio: string;
  semana_fim: string;
  status: string;
  finalizada_em: string | null;
}

type Categoria = "concil_online" | "concil_presencial" | "aij_online" | "aij_presencial" | "se_online" | "se_presencial" | "acij_online" | "acij_presencial" | "outros";

function isPresencial(aud: Audiencia): boolean {
  const tipo = (aud.tipo_audiencia || "").toLowerCase();
  const local = (aud.local || "").toLowerCase();
  if (tipo.includes("presencial") || local.includes("presencial")) return true;
  if (tipo.includes("online") || tipo.includes("virtual") || tipo.includes("vídeo") || tipo.includes("video") || local.includes("online") || local.includes("virtual")) return false;
  if (aud.link) return false;
  return true;
}

function categorizar(aud: Audiencia): Categoria {
  const tipo = (aud.tipo_audiencia || "").toLowerCase();
  const presencial = isPresencial(aud);

  if (tipo.includes("endividamento") || tipo.match(/\bse\b/)) {
    return presencial ? "se_presencial" : "se_online";
  }
  if (tipo.includes("acij") || tipo.includes("complementar")) {
    return presencial ? "acij_presencial" : "acij_online";
  }
  if (tipo.includes("concilia")) {
    return presencial ? "concil_presencial" : "concil_online";
  }
  if (tipo.includes("instru") || tipo.includes("aij")) {
    return presencial ? "aij_presencial" : "aij_online";
  }
  return "outros";
}

function getCategoriaLabel(cat: Categoria): string {
  const labels: Record<Categoria, string> = {
    concil_online: "Conciliatória Online",
    concil_presencial: "Conciliatória Presencial",
    aij_online: "AIJ Online",
    aij_presencial: "AIJ Presencial",
    se_online: "SE Online",
    se_presencial: "SE Presencial",
    acij_online: "ACIJ Online",
    acij_presencial: "ACIJ Presencial",
    outros: "Outros",
  };
  return labels[cat];
}

function getPendencias(aud: Audiencia): string[] {
  const pends: string[] = [];
  if (!aud.advogado) pends.push("Sem advogado");
  if (!aud.preposto) pends.push("Sem preposto");
  if (!isPresencial(aud) && !aud.link) pends.push("Sem link");
  if (isPresencial(aud) && !aud.foro) pends.push("Sem foro/endereço");
  return pends;
}

type KpiFilter = "total" | "atribuidas" | "pendentes" | null;

export default function DashboardHome() {
  const [semanaAtual, setSemanaAtual] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [audiencias, setAudiencias] = useState<Audiencia[]>([]);
  const [pauta, setPauta] = useState<PautaSemanal | null>(null);
  const [finalizando, setFinalizando] = useState(false);
  const [kpiModal, setKpiModal] = useState<KpiFilter>(null);
  const [editAud, setEditAud] = useState<Audiencia | null>(null);
  const [editForm, setEditForm] = useState<Partial<Audiencia>>({});
  const [saving, setSaving] = useState(false);

  const inicio = useMemo(() => semanaAtual, [semanaAtual]);
  const fim = useMemo(() => endOfWeek(semanaAtual, { weekStartsOn: 0 }), [semanaAtual]);

  const semanaLabel = useMemo(() => {
    const seg = new Date(inicio);
    seg.setDate(seg.getDate() + 1);
    const sex = new Date(fim);
    sex.setDate(sex.getDate() - 1);
    return `${format(seg, "dd/MM", { locale: ptBR })} à ${format(sex, "dd/MM/yyyy", { locale: ptBR })}`;
  }, [inicio, fim]);

  const isCurrentWeek = useMemo(() => isSameWeek(new Date(), semanaAtual, { weekStartsOn: 0 }), [semanaAtual]);

  const fetchData = useCallback(async () => {
    const inicioStr = format(inicio, "yyyy-MM-dd");
    const fimStr = format(fim, "yyyy-MM-dd");

    const [{ data: auds }, { data: pautaData }] = await Promise.all([
      supabase
        .from("audiencias")
        .select("id, autor, reu, data_audiencia, hora_audiencia, tipo_audiencia, local, foro, link, status, carteira, numero_processo, advogado, preposto, npc_dossie")
        .gte("data_audiencia", inicioStr)
        .lte("data_audiencia", fimStr),
      supabase
        .from("pautas_semanais")
        .select("*")
        .eq("semana_inicio", inicioStr)
        .maybeSingle(),
    ]);

    setAudiencias(auds || []);
    setPauta(pautaData);
  }, [inicio, fim]);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("dash-pauta")
      .on("postgres_changes", { event: "*", schema: "public", table: "audiencias" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "pautas_semanais" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const alertas = useMemo(() => {
    const result: { label: string; count: number; icon: any }[] = [];
    const semAdv = audiencias.filter((a) => !a.advogado).length;
    if (semAdv > 0) result.push({ label: "audiências sem advogado", count: semAdv, icon: Users });
    const semPrep = audiencias.filter((a) => !a.preposto).length;
    if (semPrep > 0) result.push({ label: "audiências sem preposto", count: semPrep, icon: Users });
    const onlineSemLink = audiencias.filter((a) => !isPresencial(a) && !a.link).length;
    if (onlineSemLink > 0) result.push({ label: "audiências online sem link", count: onlineSemLink, icon: Link2 });
    const presencialSemForo = audiencias.filter((a) => isPresencial(a) && !a.foro).length;
    if (presencialSemForo > 0) result.push({ label: "audiências presenciais sem foro/endereço", count: presencialSemForo, icon: MapPin });
    return result;
  }, [audiencias]);

  const pautaConcluida = pauta?.status === "concluida";

  const handleFinalizar = async () => {
    if (alertas.length > 0) {
      toast.error("Existem pendências que impedem a finalização da pauta.", {
        description: alertas.map((a) => `${a.count} ${a.label}`).join(", "),
      });
      return;
    }
    if (audiencias.length === 0) {
      toast.error("Não há audiências nesta semana para finalizar.");
      return;
    }

    setFinalizando(true);
    const inicioStr = format(inicio, "yyyy-MM-dd");
    const fimStr = format(fim, "yyyy-MM-dd");

    if (pauta) {
      await supabase.from("pautas_semanais").update({ status: "concluida", finalizada_em: new Date().toISOString() }).eq("id", pauta.id);
    } else {
      await supabase.from("pautas_semanais").insert({ semana_inicio: inicioStr, semana_fim: fimStr, status: "concluida", finalizada_em: new Date().toISOString() });
    }
    toast.success("Pauta finalizada com sucesso!");
    setFinalizando(false);
    fetchData();
  };

  const handleReabrir = async () => {
    if (!pauta) return;
    await supabase.from("pautas_semanais").update({ status: "em_montagem", finalizada_em: null }).eq("id", pauta.id);
    toast.info("Pauta reaberta.");
    fetchData();
  };

  const totalPeriodo = audiencias.length;
  const atribuidasPeriodo = audiencias.filter((a) => a.advogado && a.preposto && (isPresencial(a) ? !!a.foro : !!a.link)).length;
  const pendentesPeriodo = totalPeriodo - atribuidasPeriodo;

  const kpiAudiencias = useMemo(() => {
    if (kpiModal === "total") return audiencias;
    if (kpiModal === "atribuidas") return audiencias.filter((a) => a.advogado && a.preposto && (isPresencial(a) ? !!a.foro : !!a.link));
    if (kpiModal === "pendentes") return audiencias.filter((a) => !a.advogado || !a.preposto || (!isPresencial(a) && !a.link) || (isPresencial(a) && !a.foro));
    return [];
  }, [kpiModal, audiencias]);

  const kpiTitle = kpiModal === "total" ? "Todas as Audiências" : kpiModal === "atribuidas" ? "Audiências Completas" : "Audiências com Pendências";

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

  return (
    <div className="space-y-6">
      {/* Header + Week Selector */}
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Pauta de Audiências</h1>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setSemanaAtual((s) => addWeeks(s, -1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div
              className={`text-center px-6 py-3 rounded-xl border-2 transition-all ${
                isCurrentWeek
                  ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                  : "border-border bg-card"
              }`}
            >
              <p className={`text-xl font-bold ${isCurrentWeek ? "text-primary" : "text-foreground"}`}>
                {semanaLabel}
              </p>
              <div className="flex items-center justify-center gap-2 mt-1">
                {pautaConcluida ? (
                  <Badge className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Concluída
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-700 border-amber-300 dark:text-amber-300">
                    <Clock className="h-3 w-3 mr-1" /> Em montagem
                  </Badge>
                )}
                {isCurrentWeek && <Badge className="bg-primary/10 text-primary border-primary/30 text-xs">Semana atual</Badge>}
              </div>
            </div>

            <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setSemanaAtual((s) => addWeeks(s, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex gap-2">
            {!isCurrentWeek && (
              <Button variant="ghost" size="sm" onClick={() => setSemanaAtual(startOfWeek(new Date(), { weekStartsOn: 0 }))}>
                Ir para semana atual
              </Button>
            )}
            {pautaConcluida ? (
              <Button variant="outline" size="sm" onClick={handleReabrir}>
                <Lock className="h-4 w-4 mr-1" /> Reabrir Pauta
              </Button>
            ) : (
              <Button size="sm" onClick={handleFinalizar} disabled={finalizando}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {finalizando ? "Finalizando..." : "Finalizar Pauta"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alertas.length > 0 && !pautaConcluida && (
        <div className="space-y-2">
          {alertas.map((a, i) => (
            <Alert key={i} className="border-amber-300 bg-amber-50 dark:bg-amber-950/50">
              <a.icon className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200 font-medium">
                <span className="font-bold">{a.count}</span> {a.label}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        {([
          { key: "total" as KpiFilter, label: "Total", value: totalPeriodo, icon: Calendar, color: "text-primary", bgIcon: "bg-blue-50 dark:bg-blue-950/50" },
          { key: "atribuidas" as KpiFilter, label: "Completas", value: atribuidasPeriodo, icon: CheckCircle2, color: "text-green-600", bgIcon: "bg-green-50 dark:bg-green-950/50" },
          { key: "pendentes" as KpiFilter, label: "Pendentes", value: pendentesPeriodo, icon: AlertTriangle, color: pendentesPeriodo > 0 ? "text-amber-600" : "text-green-600", bgIcon: pendentesPeriodo > 0 ? "bg-amber-50 dark:bg-amber-950/50" : "bg-green-50 dark:bg-green-950/50" },
        ]).map(({ key, label, value, icon: Icon, color, bgIcon }) => (
          <Card
            key={key}
            className={`cursor-pointer hover:shadow-md transition-shadow border-2 ${kpiModal === key ? "border-primary shadow-md" : "hover:border-primary/30"}`}
            onClick={() => setKpiModal(kpiModal === key ? null : key)}
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl ${bgIcon} flex items-center justify-center shrink-0`}>
                <Icon className={`h-6 w-6 ${color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPI Detail Inline */}
      {kpiModal && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">{kpiTitle} — {semanaLabel}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setKpiModal(null)} className="text-muted-foreground">
              Fechar
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {kpiAudiencias.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">Nenhuma audiência encontrada.</p>
            ) : (
              <div className="overflow-auto max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">NPC</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Autor x Réu</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Advogado</TableHead>
                      <TableHead>Preposto</TableHead>
                      <TableHead>Link/Foro</TableHead>
                      <TableHead>Pendências</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kpiAudiencias.map((aud) => {
                      const pends = getPendencias(aud);
                      const cat = categorizar(aud);
                      return (
                        <TableRow key={aud.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(aud)}>
                          <TableCell className="text-sm font-mono font-bold text-primary">
                            {aud.npc_dossie || "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {aud.data_audiencia
                              ? format(new Date(aud.data_audiencia + "T00:00:00"), "dd/MM", { locale: ptBR })
                              : "—"}{" "}
                            {aud.hora_audiencia?.slice(0, 5) || ""}
                          </TableCell>
                          <TableCell className="text-sm font-medium max-w-[180px] truncate">
                            {aud.autor} x {aud.reu}
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="text-[10px]">
                              {getCategoriaLabel(cat)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {aud.advogado ? (
                              <span className="text-blue-700 dark:text-blue-300">{aud.advogado}</span>
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
                          <TableCell className="text-sm">
                            {!isPresencial(aud) ? (
                              aud.link ? (
                                <a href={aud.link} target="_blank" rel="noopener noreferrer" className="text-primary flex items-center gap-1 hover:underline" onClick={(e) => e.stopPropagation()}>
                                  <ExternalLink className="h-3 w-3" /> Link
                                </a>
                              ) : (
                                <span className="text-red-500 flex items-center gap-1"><Link2 className="h-3 w-3" /> Sem link</span>
                              )
                            ) : (
                              aud.foro ? (
                                <span className="text-muted-foreground truncate max-w-[120px] block">{aud.foro}</span>
                              ) : (
                                <span className="text-red-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> Sem foro</span>
                              )
                            )}
                          </TableCell>
                          <TableCell>
                            {pends.length > 0 ? (
                              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                                {pends.length} pend.
                              </Badge>
                            ) : (
                              <Badge className="text-[10px] bg-green-100 text-green-700 border-green-300">
                                OK
                              </Badge>
                            )}
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
      )}

      {/* Empty state when no KPI selected and no hearings */}
      {!kpiModal && totalPeriodo === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nenhuma audiência nesta semana</p>
            <p className="text-sm mt-1">Importe os relatórios Seven e eLaw na aba Importação</p>
          </CardContent>
        </Card>
      )}

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
                <Label>Advogado</Label>
                <Input value={editForm.advogado || ""} onChange={(e) => setEditForm((f) => ({ ...f, advogado: e.target.value }))} />
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
