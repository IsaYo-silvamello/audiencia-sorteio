import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";

const HEADER_MAP: Record<string, string> = {
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
  return str;
}

const ImportacaoSegura = () => {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ total: number; inserted: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImporting(true);
    setResult(null);

    let totalRows = 0;
    let totalInserted = 0;

    try {
      for (const file of Array.from(files)) {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (rows.length === 0) continue;

        const headers = Object.keys(rows[0]);
        const mapped = headers.reduce<Record<string, string>>((acc, h) => {
          const key = h.trim().toUpperCase();
          if (HEADER_MAP[key]) acc[h] = HEADER_MAP[key];
          return acc;
        }, {});

        for (const row of rows) {
          const record: Record<string, any> = { autor: "Desconhecido", reu: "Desconhecido", status: "pendente" };
          for (const [excelCol, dbCol] of Object.entries(mapped)) {
            let val = row[excelCol];
            if (dbCol === "data_audiencia") val = parseExcelDate(val);
            if (val !== "" && val !== null && val !== undefined) record[dbCol] = String(val);
          }
          if (!record.autor || record.autor === "") record.autor = "Desconhecido";
          if (!record.reu || record.reu === "") record.reu = "Desconhecido";

          const { error } = await supabase.from("audiencias").insert(record);
          if (!error) totalInserted++;
        }

        totalRows += rows.length;
      }

      setResult({ total: totalRows, inserted: totalInserted });
      toast({ title: `${totalInserted} audiências importadas de ${totalRows} (${files.length} arquivo${files.length > 1 ? "s" : ""})` });
    } catch (err: any) {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Importação de Planilha</CardTitle>
            <CardDescription>Importe audiências a partir de arquivo .xlsx ou .xls</CardDescription>
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
          {importing ? "Importando..." : "Selecionar Planilha"}
        </Button>

        {result && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-800">
              {result.inserted} de {result.total} registros importados com sucesso.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ImportacaoSegura;
