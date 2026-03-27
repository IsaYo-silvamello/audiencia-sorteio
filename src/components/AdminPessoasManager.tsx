import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Users, Trash2, Pencil, Scale, Briefcase } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface Pessoa {
  id: string;
  nome: string;
  tipo: string;
  ativo: boolean;
  documento: string | null;
  tipo_advogado?: string | null;
  estado?: string | null;
  valor_audiencia?: number | null;
  equipe?: string | null;
  carteira?: string | null;
  observacao?: string | null;
  tipo_preposto?: string | null;
  horario_trabalho?: string | null;
}

const CLIENTES_PREPOSTO = [
  "Acordos", "BRADESCO", "Eletrobrás", "GERAL", "ITAÚ", "ITAÚ - CARTÕES",
  "ITAÚ - Fraudes", "ITAÚ - SB/FRAUDE/CONSIGNADO", "ITAÚ - SUPERENDIVIDAMENTO",
  "ITAÚ JV", "MELI", "PLANOS ECONÔMICOS", "VIVO",
];

const EQUIPES = ["ELETROBRÁS", "ITAÚ", "GERAL", "MELI", "BRADESCO", "VIVO"];

const CARTEIRAS = [
  "ACORDOS", "BRADESCO", "CARTÕES", "CONSIGNADO", "DCRPF", "ELETROBRÁS",
  "FRAUDES E ILÍCITOS", "GERAL", "GOLPES", "ITAÚ", "MELI", "OBF", "OBP",
  "PLANOS ECONÔMICOS", "SERVIÇOS BANCÁRIOS", "SUCUMBÊNCIAS", "SUPERENDIVIDAMENTO",
  "TRIBUNAIS SUPERIORES", "VIVO",
];

const OBSERVACOES = ["Faz SE", "Não faz SE"];

const emptyForm = {
  nome: "", tipo: "advogado", documento: "", tipo_advogado: "interno",
  estado: "", valor_audiencia: "", equipe: "", carteira: "", observacao: "",
  tipo_preposto: "", horario_trabalho: "",
};

const AdminPessoasManager = () => {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [editPessoa, setEditPessoa] = useState<Pessoa | null>(null);
  const [editData, setEditData] = useState({ ...emptyForm });
  const [deleteTarget, setDeleteTarget] = useState<Pessoa | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchPessoas = async () => {
    try {
      const { data, error } = await supabase.from("pessoas").select("*").eq("ativo", true).order("nome");
      if (error) throw error;
      setPessoas(data || []);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao carregar", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPessoas(); }, []);

  const advogados = pessoas.filter((p) => p.tipo === "advogado");
  const prepostos = pessoas.filter((p) => p.tipo === "preposto");

  const buildPayload = (data: typeof emptyForm) => {
    const payload: any = {
      nome: data.nome, tipo: data.tipo, documento: data.documento || null,
      ativo: true, equipe: data.equipe || null, carteira: data.carteira || null,
      observacao: data.observacao || null,
    };
    if (data.tipo === "advogado") {
      payload.tipo_advogado = data.tipo_advogado;
      payload.tipo_preposto = null;
      payload.horario_trabalho = null;
      if (data.tipo_advogado === "externo") {
        payload.estado = data.estado || null;
        payload.valor_audiencia = data.valor_audiencia ? parseFloat(data.valor_audiencia) : null;
      } else {
        payload.estado = null;
        payload.valor_audiencia = null;
      }
    } else {
      payload.tipo_advogado = null;
      payload.estado = null;
      payload.valor_audiencia = null;
      payload.tipo_preposto = data.tipo_preposto || null;
      payload.horario_trabalho = data.tipo_preposto === "estagiario" ? (data.horario_trabalho || null) : null;
    }
    return payload;
  };

  const handleAdd = async () => {
    if (!formData.nome.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("pessoas").insert([buildPayload(formData)]);
      if (error) throw error;
      toast({ title: "Pessoa cadastrada com sucesso" });
      setFormData({ ...emptyForm });
      setShowAddDialog(false);
      fetchPessoas();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao cadastrar", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editPessoa) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("pessoas").update(buildPayload(editData)).eq("id", editPessoa.id);
      if (error) throw error;
      toast({ title: "Pessoa atualizada com sucesso" });
      setEditPessoa(null);
      fetchPessoas();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao atualizar", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from("pessoas").update({ ativo: false }).eq("id", deleteTarget.id);
      if (error) throw error;
      toast({ title: "Pessoa removida" });
      setDeleteTarget(null);
      fetchPessoas();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao remover", description: error.message });
    }
  };

  const openEdit = (pessoa: Pessoa) => {
    setEditPessoa(pessoa);
    setEditData({
      nome: pessoa.nome, tipo: pessoa.tipo, documento: pessoa.documento || "",
      tipo_advogado: pessoa.tipo_advogado || "interno", estado: pessoa.estado || "",
      valor_audiencia: pessoa.valor_audiencia?.toString() || "",
      equipe: pessoa.equipe || "", carteira: pessoa.carteira || "",
      observacao: pessoa.observacao || "", tipo_preposto: pessoa.tipo_preposto || "",
      horario_trabalho: pessoa.horario_trabalho || "",
    });
  };

  // Shared form fields renderer
  const renderFormFields = (data: typeof emptyForm, onChange: (d: typeof emptyForm) => void) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nome Completo</Label>
          <Input value={data.nome} onChange={(e) => onChange({ ...data, nome: e.target.value })} placeholder="Digite o nome" />
        </div>
        <div className="space-y-2">
          <Label>OAB/CPF</Label>
          <Input value={data.documento} onChange={(e) => onChange({ ...data, documento: e.target.value })} placeholder="OAB ou CPF" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select value={data.tipo} onValueChange={(v) => onChange({ ...data, tipo: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="advogado">Advogado</SelectItem>
            <SelectItem value="preposto">Preposto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data.tipo === "advogado" && (
        <>
          <div className="space-y-2">
            <Label>Tipo de Advogado</Label>
            <Select value={data.tipo_advogado} onValueChange={(v) => onChange({ ...data, tipo_advogado: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="interno">Interno</SelectItem>
                <SelectItem value="externo">Externo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {data.tipo_advogado === "externo" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input value={data.estado} onChange={(e) => onChange({ ...data, estado: e.target.value })} placeholder="Ex: SP, RJ" />
              </div>
              <div className="space-y-2">
                <Label>Valor da Audiência</Label>
                <Input type="number" step="0.01" value={data.valor_audiencia} onChange={(e) => onChange({ ...data, valor_audiencia: e.target.value })} placeholder="0.00" />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Equipe (Cliente)</Label>
            <div className="grid grid-cols-3 gap-2 border rounded-md p-3 max-h-36 overflow-y-auto">
              {EQUIPES.map((eq) => {
                const sel = data.equipe ? data.equipe.split(", ") : [];
                return (
                  <label key={eq} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={sel.includes(eq)} onCheckedChange={(c) => {
                      const n = c ? [...sel, eq] : sel.filter((s) => s !== eq);
                      onChange({ ...data, equipe: n.join(", ") });
                    }} />{eq}
                  </label>
                );
              })}
            </div>
          </div>
        </>
      )}

      {data.tipo === "preposto" && (
        <>
          <div className="space-y-2">
            <Label>Tipo de Preposto</Label>
            <Select value={data.tipo_preposto} onValueChange={(v) => onChange({ ...data, tipo_preposto: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="estagiario">Estagiário</SelectItem>
                <SelectItem value="assistente">Assistente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {data.tipo_preposto === "estagiario" && (
            <div className="space-y-2">
              <Label>Horário de Trabalho</Label>
              <Select value={data.horario_trabalho} onValueChange={(v) => onChange({ ...data, horario_trabalho: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="09:00 - 16:00">09:00 - 16:00</SelectItem>
                  <SelectItem value="13:00 - 19:00">13:00 - 19:00</SelectItem>
                  <SelectItem value="Integral">Integral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Clientes</Label>
            <div className="grid grid-cols-2 gap-2 border rounded-md p-3 max-h-36 overflow-y-auto">
              {CLIENTES_PREPOSTO.map((c) => {
                const sel = data.equipe ? data.equipe.split(", ") : [];
                return (
                  <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={sel.includes(c)} onCheckedChange={(ch) => {
                      const n = ch ? [...sel, c] : sel.filter((s) => s !== c);
                      onChange({ ...data, equipe: n.join(", ") });
                    }} />{c}
                  </label>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label>Carteira (Assunto)</Label>
        <div className="grid grid-cols-3 gap-2 border rounded-md p-3 max-h-36 overflow-y-auto">
          {CARTEIRAS.map((c) => {
            const sel = data.carteira ? data.carteira.split(", ").filter(Boolean) : [];
            return (
              <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={sel.includes(c)} onCheckedChange={(ch) => {
                  const n = ch ? [...sel, c] : sel.filter((s) => s !== c);
                  onChange({ ...data, carteira: n.join(", ") });
                }} />{c}
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Observação</Label>
        <Select value={data.observacao} onValueChange={(v) => onChange({ ...data, observacao: v })}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            {OBSERVACOES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderPessoaRow = (pessoa: Pessoa) => (
    <div key={pessoa.id} className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
      <div className="space-y-1">
        <span className="font-medium text-foreground">{pessoa.nome}</span>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {pessoa.documento && <Badge variant="outline" className="text-[11px]">OAB/CPF: {pessoa.documento}</Badge>}
          {pessoa.tipo_advogado && <Badge variant="outline" className="text-[11px] capitalize">{pessoa.tipo_advogado}</Badge>}
          {pessoa.tipo_preposto && (
            <Badge variant="outline" className="text-[11px] capitalize">
              {pessoa.tipo_preposto === "estagiario" ? "Estagiário" : "Assistente"}
            </Badge>
          )}
          {pessoa.tipo_preposto === "estagiario" && pessoa.horario_trabalho && (
            <Badge variant="secondary" className="text-[11px]">{pessoa.horario_trabalho}</Badge>
          )}
          {pessoa.tipo_advogado === "externo" && pessoa.estado && (
            <Badge variant="secondary" className="text-[11px]">{pessoa.estado}</Badge>
          )}
          {pessoa.tipo_advogado === "externo" && pessoa.valor_audiencia && (
            <Badge variant="secondary" className="text-[11px]">R$ {pessoa.valor_audiencia.toFixed(2)}</Badge>
          )}
          {pessoa.observacao && <Badge variant="secondary" className="text-[11px]">{pessoa.observacao}</Badge>}
        </div>
        {pessoa.equipe && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium text-primary">Cliente:</span> {pessoa.equipe}</p>}
        {pessoa.carteira && <p className="text-xs text-muted-foreground"><span className="font-medium">Carteira:</span> {pessoa.carteira}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => openEdit(pessoa)}>
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(pessoa)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );

  if (loading) return <p className="text-center text-muted-foreground py-8">Carregando...</p>;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Gerenciar Pessoas</h3>
            <p className="text-sm text-muted-foreground">{pessoas.length} colaboradores ativos</p>
          </div>
          <Button onClick={() => { setFormData({ ...emptyForm }); setShowAddDialog(true); }}>
            <UserPlus className="h-4 w-4 mr-2" />
            Nova Pessoa
          </Button>
        </div>

        <Tabs defaultValue="advogados" className="w-full">
          <TabsList className="w-full max-w-md">
            <TabsTrigger value="advogados" className="flex-1 gap-2">
              <Scale className="h-4 w-4" />
              Advogados ({advogados.length})
            </TabsTrigger>
            <TabsTrigger value="prepostos" className="flex-1 gap-2">
              <Briefcase className="h-4 w-4" />
              Prepostos ({prepostos.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="advogados" className="mt-4 space-y-2">
            {advogados.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum advogado cadastrado</p>
            ) : advogados.map(renderPessoaRow)}
          </TabsContent>

          <TabsContent value="prepostos" className="mt-4 space-y-2">
            {prepostos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum preposto cadastrado</p>
            ) : prepostos.map(renderPessoaRow)}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog: Nova Pessoa */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Nova Pessoa</DialogTitle>
            <DialogDescription>Preencha os dados do novo colaborador.</DialogDescription>
          </DialogHeader>
          {renderFormFields(formData, setFormData)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={saving || !formData.nome.trim()}>
              {saving ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Pessoa */}
      <Dialog open={!!editPessoa} onOpenChange={(open) => !open && setEditPessoa(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Pessoa</DialogTitle>
            <DialogDescription>Altere os dados e salve.</DialogDescription>
          </DialogHeader>
          {renderFormFields(editData, setEditData)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPessoa(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert: Confirmar exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription className="text-justify">
              Tem certeza que deseja remover <strong>{deleteTarget?.nome}</strong>? A pessoa será desativada do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminPessoasManager;
