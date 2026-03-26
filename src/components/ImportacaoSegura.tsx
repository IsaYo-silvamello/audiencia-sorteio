import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, CheckCircle2, Clock, History, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";

const HEADER_MAP: Record<string, string> = {
  // === Planilhas Seven e eLaw (cabeçalhos reais) ===
  "NPC": "npc_dossie",
  "DATA/HORA PRAZO": "data_audiencia",
  "DATAPRAZO": "data_audiencia",
  "HORA DO COMPROMISSO": "hora_audiencia",
  "HORA DO PRAZO": "hora_audiencia",
  "SUB TIPO COMPROMISSO": "tipo_audiencia",
  "PARTE CLIENTE": "reu",
  "PARTE ADVERSA": "autor",
  "NÚMERO DO PROCESSO": "numero_processo",
  "NUMERO DO PROCESSO": "numero_processo",
  "COMARCA": "comarca",
  "FORO": "foro",
  "ASSUNTO": "assunto",
  "CARTEIRA": "carteira",
  "ESTRATÉGIA": "estrategia",
  "ESTRATEGIA": "estrategia",
  "ADVOGADO ADVERSO": "adv_do_autor",
  "ADV. RESPONSÁVEL PROCESSO": "adv_responsavel",
  "ADV. RESPONSAVEL PROCESSO": "adv_responsavel",
  "OBSERVAÇÃO PROCESSO": "observacoes",
  "OBSERVACAO PROCESSO": "observacoes",
  "OBSERVAÇÃO DO PRAZO": "observacoes",
  "OBSERVACAO DO PRAZO": "observacoes",
  "ID PROCESSO": "id_planilha",
  "STATUS DO COMPROMISSO": "status",
  "STATUS DO PRAZO": "status",
  "LOCAL": "local",
  "ESTADO": "estado_temp",

  // === Fallback (mapeamento antigo) ===
  "ID": "id_planilha",
  "NPC/DOSSIÊ": "npc_dossie",
  "NPC/DOSSIE": "npc_dossie",
  "AUTOR": "autor",
  "PROCESSO": "numero_processo",
  "DATA": "data_audiencia",
  "HORÁRIO": "hora_audiencia",
  "HORARIO": "hora_audiencia",
  "TIPO DA AUDIENCIA": "tipo_audiencia",
  "TIPO DA AUDIÊNCIA": "tipo_audiencia",
  "STATUS": "status",
  "ADVOGADO": "advogado",
  "PREPOSTO": "preposto",
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
  const str = String(value).trim();
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  const brDateTimeMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})\s/);
  if (brDateTimeMatch) return `${brDateTimeMatch[3]}-${brDateTimeMatch[2]}-${brDateTimeMatch[1]}`;
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) return str.substring(0, 10);
  return str;
}

function parseExcelTime(value: any): string | null {
  if (!value) return null;
  const str = String(value).trim();
  const timeMatch = str.match(/(\d{1,2}:\d{2}(:\d{2})?)/);
  if (timeMatch) return timeMatch[1];
  if (typeof value === "number" && value < 1) {
    const totalMinutes = Math.round(value * 24 * 60);
    const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const m = String(totalMinutes % 60).padStart(2, "0");
    return `${h}:${m}`;
  }
  return null;
}

function extractTimeFromDateTime(value: any): string | null {
  if (!value) return null;
  const str = String(value).trim();
  const match = str.match(/\d{2}\/\d{2}\/\d{4}\s+(\d{1,2}:\d{2}(:\d{2})?)/);
  if (match) return match[1];
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

// Get the week range (Sun-Sat) for a given date string
function getWeekRange(dateStr: string): { start: string; end: string } | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (dt: Date) => dt.toISOString().substring(0, 10);
  return { start: fmt(start), end: fmt(end) };
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
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState("");
  const [result, setResult] = useState<{ total: number; inserted: number; updated: number } | null>(null);
  const [historico, setHistorico] = useState<HistoricoImportacao[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchHistorico();
  }, []);

  const fetchHistorico = async () => {
    const { data } = await supabase
      .from("historico_importacoes")
      .select("*")
      .order("data_importacao", { ascending: false })
      .limit(20);
    if (data) setHistorico(data as HistoricoImportacao[]);
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
        const mapped = headers.reduce<Record<string, string>>((acc, h) => {
          const key = h.trim().toUpperCase();
          if (HEADER_MAP[key]) acc[h] = HEADER_MAP[key];
          return acc;
        }, {});

        const dataHoraCol = headers.find(h => h.trim().toUpperCase() === "DATA/HORA PRAZO");
        const hasHoraCol = headers.some(h => {
          const k = h.trim().toUpperCase();
          return k === "HORA DO COMPROMISSO" || k === "HORA DO PRAZO";
        });

        let rowIndex = 0;
        for (const row of rows) {
          rowIndex++;
          setImportProgress(Math.round((rowIndex / allRowsCount) * 100));
          const record: Record<string, any> = { status: "pendente" };

          for (const [excelCol, dbCol] of Object.entries(mapped)) {
            if (dbCol === "estado_temp") continue;
            let val = row[excelCol];
            if (dbCol === "data_audiencia") val = parseExcelDate(val);
            else if (dbCol === "hora_audiencia") val = parseExcelTime(val);
            else if (dbCol === "status") val = normalizeStatus(String(val));
            if (val !== "" && val !== null && val !== undefined) record[dbCol] = String(val);
          }

          if (!record.hora_audiencia && dataHoraCol && !hasHoraCol) {
            const extracted = extractTimeFromDateTime(row[dataHoraCol]);
            if (extracted) record.hora_audiencia = extracted;
          }

          if (!record.autor || record.autor === "") record.autor = "Desconhecido";
          if (!record.reu || record.reu === "") record.reu = "Desconhecido";

          // Deduplication by NPC (unique per audiência)
          if (record.npc_dossie) {
            const { data: existing } = await supabase
              .from("audiencias")
              .select("id")
              .eq("npc_dossie", record.npc_dossie);

            if (existing && existing.length > 0) {
              const { error } = await supabase
                .from("audiencias")
                .update(record)
                .eq("id", existing[0].id);
              if (!error) totalUpdated++;

              if (existing.length > 1) {
                const duplicateIds = existing.slice(1).map(e => e.id);
                await supabase.from("atribuicoes").delete().in("audiencia_id", duplicateIds);
                await supabase.from("audiencias").delete().in("id", duplicateIds);
              }
            } else {
              const { error } = await supabase.from("audiencias").insert(record);
              if (!error) totalInserted++;
            }
          } else {
            const { error } = await supabase.from("audiencias").insert(record);
            if (!error) totalInserted++;
          }
        }

        totalRows += rows.length;
      }

      setResult({ total: totalRows, inserted: totalInserted, updated: totalUpdated });

      // Log to history
      await supabase.from("historico_importacoes").insert({
        arquivos: fileNames.join(", "),
        total_registros: totalRows,
        inseridos: totalInserted,
        atualizados: totalUpdated,
      });
      await fetchHistorico();

      toast({
        title: `Importação concluída`,
        description: `${totalInserted} inseridas, ${totalUpdated} atualizadas de ${totalRows} registros (${files.length} arquivo${files.length > 1 ? "s" : ""})`,
      });
    } catch (err: any) {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      {importing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-8 rounded-xl bg-card border shadow-lg max-w-sm w-full mx-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-lg font-semibold text-foreground">Importando...</p>
            <p className="text-sm text-muted-foreground text-center">{importStatus}</p>
            <Progress value={importProgress} className="w-full" />
            <p className="text-xs text-muted-foreground">Não feche ou clique em nada até finalizar.</p>
          </div>
        </div>
      )}
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Importação de Planilha</CardTitle>
              <CardDescription>Importe audiências a partir de arquivo .xlsx ou .xls (Seven e eLaw)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            multiple
            className="hidden"
            onChange={handleFile}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            size="lg"
            className="w-full"
          >
            <Upload className="h-5 w-5 mr-2" />
            {importing ? "Importando..." : "Selecionar Planilhas (Seven / eLaw)"}
          </Button>

          {result && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-800">
                {result.inserted} inseridas, {result.updated} atualizadas de {result.total} registros.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Importações */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
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
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma importação registrada.</p>
          ) : (
            <div className="space-y-3">
              {historico.map((h) => (
                <div key={h.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{h.arquivos}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{format(new Date(h.data_importacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                      <span>•</span>
                      <span>{h.inseridos} inseridas</span>
                      <span>•</span>
                      <span>{h.atualizados} atualizadas</span>
                      <span>•</span>
                      <span>{h.total_registros} total</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
};

export default ImportacaoSegura;
