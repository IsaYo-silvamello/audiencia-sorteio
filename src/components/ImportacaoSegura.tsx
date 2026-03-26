import React, { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Upload, FileSpreadsheet, CheckCircle2, History, Clock, ArrowRight, AlertTriangle, FileText, RefreshCw, PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const HEADER_MAP: Record<string, string> = {
  // ===== planilha exp / eLaw =====
  NPC: "npc_dossie",
  "ID PROCESSO": "id_planilha",
  "PARTE ADVERSA": "autor",
  "NÚMERO DO PROCESSO": "numero_processo",
  "NUMERO DO PROCESSO": "numero_processo",
  "DATA/HORA PRAZO": "data_audiencia",
  "HORA DO COMPROMISSO": "hora_audiencia",
  "SUB TIPO COMPROMISSO": "tipo_audiencia",
  FORO: "foro",
  COMARCA: "comarca",
  ASSUNTO: "assunto",
  CARTEIRA: "carteira",
  "STATUS DO COMPROMISSO": "status",
  ESTRATÉGIA: "estrategia",
  ESTRATEGIA: "estrategia",
  "PARTE CLIENTE": "reu",
  "ADV. RESPONSÁVEL PROCESSO": "adv_responsavel",
  "ADV. RESPONSAVEL PROCESSO": "adv_responsavel",
  "ADVOGADO ADVERSO": "adv_do_autor",
  "OBSERVAÇÃO PROCESSO": "observacoes",
  "OBSERVACAO PROCESSO": "observacoes",

  // ===== modelo pauta =====
  ID: "id_planilha",
  "NPC/DOSSIÊ": "npc_dossie",
  "NPC/DOSSIE": "npc_dossie",
  AUTOR: "autor",
  PROCESSO: "numero_processo",
  DATA: "data_audiencia",
  HORÁRIO: "hora_audiencia",
  HORARIO: "hora_audiencia",
  "TIPO DA AUDIENCIA": "tipo_audiencia",
  "TIPO DA AUDIÊNCIA": "tipo_audiencia",
  LOCAL: "local",
  ADVOGADO: "advogado",
  PREPOSTO: "preposto",
  "ESTRATÉGIA SMAA": "estrategia_smaa",
  "ESTRATEGIA SMAA": "estrategia_smaa",
  "CLIENTE (RÉU)": "reu",
  "CLIENTE (REU)": "reu",
  "ADV RESPONSAVEL": "adv_responsavel",
  "ADV RESPONSÁVEL": "adv_responsavel",
  "OBSERVAÇÕES DOCUMENTAÇÃO": "documentacao",
  "OBSERVACOES DOCUMENTACAO": "documentacao",
  LINK: "link",
  "ADV DO AUTOR": "adv_do_autor",
  "CONTATO CARTORIO": "contato_cartorio",
  "CONTATO CARTÓRIO": "contato_cartorio",
  OBSERVAÇÕES: "observacoes",
  OBSERVACOES: "observacoes",
};

function parseExcelDate(value: any): string | null {
  if (!value) return null;

  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      const month = String(date.m).padStart(2, "0");
      const day = String(date.d).padStart(2, "0");
      return `${date.y}-${month}-${day}`;
    }
  }

  const str = String(value).trim();

  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }

  const brDateTimeMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})\s/);
  if (brDateTimeMatch) {
    return `${brDateTimeMatch[3]}-${brDateTimeMatch[2]}-${brDateTimeMatch[1]}`;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }

  return null;
}

function cleanProcessNumber(value: any): string | null {
  if (!value) return null;

  return String(value).trim().replace(/\.$/, "").replace(/\s+/g, "");
}

function parseExcelTime(value: any): string | null {
  if (!value) return null;

  if (typeof value === "number" && value < 1) {
    const totalMinutes = Math.round(value * 24 * 60);
    const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const m = String(totalMinutes % 60).padStart(2, "0");
    return `${h}:${m}`;
  }

  const str = String(value).trim();
  const timeMatch = str.match(/(\d{1,2}:\d{2})(:\d{2})?/);

  if (timeMatch) {
    return timeMatch[1].padStart(5, "0");
  }

  return null;
}

function extractTimeFromDateTime(value: any): string | null {
  if (!value) return null;

  const str = String(value).trim();
  const match = str.match(/\d{2}\/\d{2}\/\d{4}\s+(\d{1,2}:\d{2})(:\d{2})?/);

  if (match) {
    return match[1].padStart(5, "0");
  }

  return null;
}

function normalizeStatus(value: string): string {
  const lower = value.toLowerCase().trim();

  if (lower === "pendente" || lower.includes("pendente")) return "pendente";
  if (lower === "concluído" || lower === "concluido" || lower.includes("conclu")) return "realizada";
  if (lower === "cancelado" || lower === "cancelada" || lower.includes("cancel")) return "cancelada";
  if (lower.includes("atribu")) return "atribuida";
  if (lower.includes("realiz")) return "realizada";

  return "pendente";
}

function mergeWithExisting(existing: Record<string, any>, incoming: Record<string, any>) {
  const result = { ...existing };

  for (const [key, value] of Object.entries(incoming)) {
    if (value !== "" && value !== null && value !== undefined) {
      result[key] = value;
    }
  }

  return result;
}

interface HistoricoImportacao {
  id: string;
  data_importacao: string;
  arquivos: string;
  total_registros: number;
  inseridos: number;
  atualizados: number;
}

const ImportacaoSegura = () => {
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState("");
  const [result, setResult] = useState<{
    total: number;
    inserted: number;
    updated: number;
  } | null>(null);
  const [historico, setHistorico] = useState<HistoricoImportacao[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchHistorico();
  }, []);

  const fetchHistorico = async () => {
    const { data, error } = await supabase
      .from("historico_importacoes")
      .select("*")
      .order("data_importacao", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Erro ao buscar histórico:", error);
      return;
    }

    if (data) {
      setHistorico(data as HistoricoImportacao[]);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImporting(true);
    setResult(null);
    setImportProgress(0);
    setImportStatus("Lendo planilhas...");

    let totalRows = 0;
    let totalInserted = 0;
    let totalUpdated = 0;
    const fileNames: string[] = [];

    try {
      for (const file of Array.from(files)) {
        fileNames.push(file.name);

        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const allRowsCount = rows.length;

        if (rows.length === 0) continue;

        setImportStatus(`Processando ${file.name} (${allRowsCount} registros)...`);

        const headers = Object.keys(rows[0]);

        const mapped = headers.reduce<Record<string, string>>((acc, header) => {
          const normalized = header.trim().toUpperCase();
          if (HEADER_MAP[normalized]) {
            acc[header] = HEADER_MAP[normalized];
          }
          return acc;
        }, {});

        let rowIndex = 0;

        for (const row of rows) {
          rowIndex++;
          setImportProgress(Math.round((rowIndex / allRowsCount) * 100));

          const record: Record<string, any> = {
            status: "pendente",
            local: null,
            advogado: null,
            preposto: null,
            estrategia_smaa: null,
            documentacao: null,
            link: null,
            contato_cartorio: null,
          };

          for (const [excelCol, dbCol] of Object.entries(mapped)) {
            let val = row[excelCol];

            if (dbCol === "data_audiencia") {
              val = parseExcelDate(val);
            } else if (dbCol === "hora_audiencia") {
              val = parseExcelTime(val);
            } else if (dbCol === "status") {
              val = normalizeStatus(String(val || ""));
            } else if (dbCol === "numero_processo") {
              val = cleanProcessNumber(val);
            } else if (typeof val === "string") {
              val = val.trim();
            }

            if (val !== "" && val !== null && val !== undefined) {
              record[dbCol] = val;
            }
          }

          if (!record.hora_audiencia && row["DATA/HORA PRAZO"]) {
            const extracted = extractTimeFromDateTime(row["DATA/HORA PRAZO"]);
            if (extracted) {
              record.hora_audiencia = extracted;
            }
          }

          if (!record.autor) record.autor = "Desconhecido";
          if (!record.reu) record.reu = "Desconhecido";
          if (!record.status) record.status = "pendente";

          let existingRecord: any = null;

          if (record.npc_dossie) {
            const { data, error } = await supabase
              .from("audiencias")
              .select("*")
              .eq("npc_dossie", record.npc_dossie)
              .limit(1);

            if (error) {
              console.error("Erro ao buscar audiência por NPC:", error);
            } else if (data && data.length > 0) {
              existingRecord = data[0];
            }
          }

          if (!existingRecord && record.numero_processo && record.data_audiencia && record.hora_audiencia) {
            const { data, error } = await supabase
              .from("audiencias")
              .select("*")
              .eq("numero_processo", record.numero_processo)
              .eq("data_audiencia", record.data_audiencia)
              .eq("hora_audiencia", record.hora_audiencia)
              .limit(1);

            if (error) {
              console.error("Erro ao buscar audiência por processo/data/hora:", error);
            } else if (data && data.length > 0) {
              existingRecord = data[0];
            }
          }

          if (existingRecord) {
            const mergedRecord = mergeWithExisting(existingRecord, record);

            const { error } = await supabase.from("audiencias").update(mergedRecord).eq("id", existingRecord.id);

            if (error) {
              console.error("Erro ao atualizar audiência:", error);
            } else {
              totalUpdated++;
            }
          } else {
            const { error } = await supabase.from("audiencias").insert(record);

            if (error) {
              console.error("Erro ao inserir audiência:", error);
            } else {
              totalInserted++;
            }
          }
        }

        totalRows += rows.length;
      }

      setResult({
        total: totalRows,
        inserted: totalInserted,
        updated: totalUpdated,
      });

      const { error: historicoError } = await supabase.from("historico_importacoes").insert({
        arquivos: fileNames.join(", "),
        total_registros: totalRows,
        inseridos: totalInserted,
        atualizados: totalUpdated,
      });

      if (historicoError) {
        console.error("Erro ao salvar histórico:", historicoError);
      }

      await fetchHistorico();

      toast({
        title: "✅ Importação concluída",
        description: `${totalRows} registros processados com sucesso.`,
      });
    } catch (err: any) {
      console.error("Erro na importação:", err);
      toast({
        title: "Erro na importação",
        description: err?.message || "Erro inesperado ao importar planilha.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      setImportProgress(0);
      setImportStatus("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      {importing && (
        <div className="mb-6 rounded-lg border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">{importStatus || "Importando..."}</p>
            <span className="text-sm text-muted-foreground">{importProgress}%</span>
          </div>
          <Progress value={importProgress} className="h-2" />
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Importe sua pauta de audiências</CardTitle>
                <CardDescription>
                  Importe audiências a partir de arquivo .xlsx ou .xls nos layouts Seven/eLaw.
                </CardDescription>
                <p className="text-sm text-muted-foreground mt-1">
                  O sistema irá validar, identificar inconsistências e processar automaticamente as audiências.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <input ref={fileRef} type="file" accept=".xlsx,.xls" multiple className="hidden" onChange={handleFile} />

            <Button onClick={() => fileRef.current?.click()} disabled={importing} size="lg" className="w-full">
              <Upload className="mr-2 h-5 w-5" />
              {importing ? "Importando..." : "Selecionar Planilhas"}
            </Button>

            {result && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <h3 className="text-base font-semibold text-green-800">Importação concluída com sucesso</h3>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 rounded-lg bg-white/80 border border-green-100 p-3">
                    <PlusCircle className="h-4 w-4 text-green-600 shrink-0" />
                    <div>
                      <p className="text-lg font-bold text-green-800">{result.inserted}</p>
                      <p className="text-xs text-green-600">Importadas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white/80 border border-green-100 p-3">
                    <RefreshCw className="h-4 w-4 text-green-600 shrink-0" />
                    <div>
                      <p className="text-lg font-bold text-green-800">{result.updated}</p>
                      <p className="text-xs text-green-600">Atualizadas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white/80 border border-green-100 p-3">
                    <FileText className="h-4 w-4 text-green-600 shrink-0" />
                    <div>
                      <p className="text-lg font-bold text-green-800">{result.total}</p>
                      <p className="text-xs text-green-600">Processados</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-white/80 border border-green-100 p-2.5 px-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    {result.total - result.inserted - result.updated === 0
                      ? "Nenhuma inconsistência encontrada."
                      : `${result.total - result.inserted - result.updated} registro(s) com inconsistência.`}
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate("/?tab=audiencias")}
                  >
                    <ArrowRight className="mr-1.5 h-4 w-4" />
                    Ir para Audiências
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate("/?tab=audiencias&status=pendente")}
                  >
                    <AlertTriangle className="mr-1.5 h-4 w-4" />
                    Revisar Pendentes
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <History className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Histórico de Importações</CardTitle>
                <CardDescription>Registro de todas as importações realizadas</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {historico.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma importação registrada.</p>
            ) : (
              <div className="space-y-3">
                {historico.map((h) => {
                  const inconsistencias = h.total_registros - h.inseridos - h.atualizados;
                  const hasIssues = inconsistencias > 0;

                  return (
                    <div key={h.id} className="flex items-start gap-3 rounded-lg border bg-card p-3">
                      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${hasIssues ? 'bg-amber-100' : 'bg-green-100'}`}>
                        {hasIssues
                          ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          : <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{h.arquivos}</p>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${hasIssues ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                            {hasIssues ? 'Inconsistência' : 'Sucesso'}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {format(new Date(h.data_importacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <PlusCircle className="h-3 w-3" /> {h.inseridos} importadas
                          </span>
                          <span className="flex items-center gap-1">
                            <RefreshCw className="h-3 w-3" /> {h.atualizados} atualizadas
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" /> {h.total_registros} total
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default ImportacaoSegura;
