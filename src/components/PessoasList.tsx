import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Users, Trash2, Pencil } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

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
}

const EQUIPES = [
  "ELETROBRÁS",
  "ELETROBRÁS/GERAL",
  "ITAÚ",
  "GERAL",
  "MELI",
  "BRADESCO/MELI",
  "BRADESCO",
  "VIVO",
];

const CARTEIRAS = [
  "GERAL",
  "GOLPES",
  "TRIBUNAIS SUPERIORES",
  "SUPERENDIVIDAMENTO",
  "CARTÕES",
  "DCRPF",
  "OBP",
  "CONSIGNADO",
  "OBF",
  "SERVIÇOS BANCÁRIOS",
  "FRAUDES E ILÍCITOS",
  "SUCUMBÊNCIAS",
  "ELETROBRÁS",
  "MELI",
  "PLANOS ECONÔMICOS",
  "ITAU - GOLPES",
];

const OBSERVACOES = ["Faz SE", "Não faz SE"];

const PessoasList = () => {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "advogado",
    documento: "",
    tipo_advogado: "interno",
    estado: "",
    valor_audiencia: "",
    equipe: "",
    carteira: "",
    observacao: "",
  });
  const [editPessoa, setEditPessoa] = useState<Pessoa | null>(null);
  const [editData, setEditData] = useState({
    nome: "",
    tipo: "advogado",
    documento: "",
    tipo_advogado: "interno",
    estado: "",
    valor_audiencia: "",
    equipe: "",
    carteira: "",
    observacao: "",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchPessoas = async () => {
    try {
      const { data, error } = await supabase
        .from("pessoas")
        .select("*")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      setPessoas(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar pessoas",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPessoas();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToInsert: any = {
        nome: formData.nome,
        tipo: formData.tipo,
        documento: formData.documento || null,
        ativo: true,
        equipe: formData.equipe || null,
        carteira: formData.carteira || null,
        observacao: formData.observacao || null,
      };

      if (formData.tipo === "advogado") {
        dataToInsert.tipo_advogado = formData.tipo_advogado;
        if (formData.tipo_advogado === "externo") {
          dataToInsert.estado = formData.estado || null;
          dataToInsert.valor_audiencia = formData.valor_audiencia ? parseFloat(formData.valor_audiencia) : null;
        }
      }

      const { error } = await supabase.from("pessoas").insert([dataToInsert]);

      if (error) throw error;

      toast({
        title: "Pessoa cadastrada com sucesso",
        description: `${formData.tipo === "advogado" ? "Advogado" : "Preposto"} adicionado ao sistema.`,
      });

      setFormData({ 
        nome: "", 
        tipo: "advogado", 
        documento: "",
        tipo_advogado: "interno",
        estado: "",
        valor_audiencia: "",
        equipe: "",
        carteira: "",
        observacao: "",
      });
      fetchPessoas();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar pessoa",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("pessoas")
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Pessoa removida",
        description: "A pessoa foi desativada do sistema.",
      });
      fetchPessoas();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao remover pessoa",
        description: error.message,
      });
    }
  };

  const openEdit = (pessoa: Pessoa) => {
    setEditPessoa(pessoa);
    setEditData({
      nome: pessoa.nome,
      tipo: pessoa.tipo,
      documento: pessoa.documento || "",
      tipo_advogado: pessoa.tipo_advogado || "interno",
      estado: pessoa.estado || "",
      valor_audiencia: pessoa.valor_audiencia?.toString() || "",
      equipe: pessoa.equipe || "",
      carteira: pessoa.carteira || "",
      observacao: pessoa.observacao || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editPessoa) return;
    setSaving(true);
    try {
      const updateData: any = {
        nome: editData.nome,
        tipo: editData.tipo,
        documento: editData.documento || null,
        equipe: editData.equipe || null,
        carteira: editData.carteira || null,
        observacao: editData.observacao || null,
      };

      if (editData.tipo === "advogado") {
        updateData.tipo_advogado = editData.tipo_advogado;
        if (editData.tipo_advogado === "externo") {
          updateData.estado = editData.estado || null;
          updateData.valor_audiencia = editData.valor_audiencia ? parseFloat(editData.valor_audiencia) : null;
        } else {
          updateData.estado = null;
          updateData.valor_audiencia = null;
        }
      } else {
        updateData.tipo_advogado = null;
        updateData.estado = null;
        updateData.valor_audiencia = null;
      }

      const { error } = await supabase
        .from("pessoas")
        .update(updateData)
        .eq("id", editPessoa.id);

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

  const advogados = pessoas.filter((p) => p.tipo === "advogado");
  const prepostos = pessoas.filter((p) => p.tipo === "preposto");

  const renderEquipeSelect = (value: string, onChange: (v: string) => void) => (
    <div className="space-y-2">
      <Label>Equipe (Cliente)</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione o cliente" />
        </SelectTrigger>
        <SelectContent>
          {EQUIPES.map((eq) => (
            <SelectItem key={eq} value={eq}>{eq}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const renderCarteiraSelect = (value: string, onChange: (v: string) => void) => (
    <div className="space-y-2">
      <Label>Carteira (Assunto)</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione a carteira" />
        </SelectTrigger>
        <SelectContent>
          {CARTEIRAS.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const renderObservacaoSelect = (value: string, onChange: (v: string) => void) => (
    <div className="space-y-2">
      <Label>Observação</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          {OBSERVACOES.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const renderPessoaRow = (pessoa: Pessoa, tipoLabel: string, badgeVariant: "outline" | "secondary" | "default") => (
    <div
      key={pessoa.id}
      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
    >
      <div className="flex items-center gap-3">
        <Badge variant={badgeVariant}>{tipoLabel}</Badge>
        <div>
          <span className="font-medium block">{pessoa.nome}</span>
          <div className="flex flex-col text-sm text-muted-foreground">
            {pessoa.documento && <span>OAB/CPF: {pessoa.documento}</span>}
            {pessoa.tipo_advogado && (
              <span className="capitalize">{pessoa.tipo_advogado}</span>
            )}
            {pessoa.tipo_advogado === "externo" && pessoa.estado && (
              <span>Estado: {pessoa.estado}</span>
            )}
            {pessoa.tipo_advogado === "externo" && pessoa.valor_audiencia && (
              <span>Valor: R$ {pessoa.valor_audiencia.toFixed(2)}</span>
            )}
            {pessoa.equipe && (
              <span className="text-primary font-medium">Cliente: {pessoa.equipe}</span>
            )}
            {pessoa.carteira && (
              <span>Carteira: {pessoa.carteira}</span>
            )}
            {pessoa.observacao && (
              <span>Obs: {pessoa.observacao}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => openEdit(pessoa)}>
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => handleDelete(pessoa.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Cadastrar Pessoa</CardTitle>
                <CardDescription>Advogados e Prepostos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input
                  id="nome"
                  placeholder="Digite o nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="documento">OAB/CPF</Label>
                <Input
                  id="documento"
                  placeholder="Digite OAB ou CPF"
                  value={formData.documento}
                  onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advogado">Advogado</SelectItem>
                    <SelectItem value="preposto">Preposto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.tipo === "advogado" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="tipo_advogado">Tipo de Advogado</Label>
                    <Select
                      value={formData.tipo_advogado}
                      onValueChange={(value) => setFormData({ ...formData, tipo_advogado: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interno">Interno</SelectItem>
                        <SelectItem value="externo">Externo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.tipo_advogado === "externo" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="estado">Estado</Label>
                        <Input
                          id="estado"
                          placeholder="Ex: SP, RJ, MG"
                          value={formData.estado}
                          onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="valor_audiencia">Valor da Audiência</Label>
                        <Input
                          id="valor_audiencia"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.valor_audiencia}
                          onChange={(e) => setFormData({ ...formData, valor_audiencia: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {renderEquipeSelect(formData.equipe, (v) => setFormData({ ...formData, equipe: v }))}
              {renderCarteiraSelect(formData.carteira, (v) => setFormData({ ...formData, carteira: v }))}
              {renderObservacaoSelect(formData.observacao, (v) => setFormData({ ...formData, observacao: v }))}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Cadastrando..." : "Cadastrar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Advogados ({advogados.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {advogados.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum advogado cadastrado
                </p>
              ) : (
                <div className="space-y-2">
                  {advogados.map((pessoa) => renderPessoaRow(pessoa, "Advogado", "outline"))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Prepostos ({prepostos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {prepostos.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum preposto cadastrado
                </p>
              ) : (
                <div className="space-y-2">
                  {prepostos.map((pessoa) => renderPessoaRow(pessoa, "Preposto", "secondary"))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de edição */}
      <Dialog open={!!editPessoa} onOpenChange={(open) => !open && setEditPessoa(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Pessoa</DialogTitle>
            <DialogDescription>Altere os dados e salve.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                value={editData.nome}
                onChange={(e) => setEditData({ ...editData, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>OAB/CPF</Label>
              <Input
                value={editData.documento}
                onChange={(e) => setEditData({ ...editData, documento: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={editData.tipo} onValueChange={(v) => setEditData({ ...editData, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="advogado">Advogado</SelectItem>
                  <SelectItem value="preposto">Preposto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editData.tipo === "advogado" && (
              <>
                <div className="space-y-2">
                  <Label>Tipo de Advogado</Label>
                  <Select value={editData.tipo_advogado} onValueChange={(v) => setEditData({ ...editData, tipo_advogado: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interno">Interno</SelectItem>
                      <SelectItem value="externo">Externo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editData.tipo_advogado === "externo" && (
                  <>
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Input value={editData.estado} onChange={(e) => setEditData({ ...editData, estado: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor da Audiência</Label>
                      <Input type="number" step="0.01" value={editData.valor_audiencia} onChange={(e) => setEditData({ ...editData, valor_audiencia: e.target.value })} />
                    </div>
                  </>
                )}
              </>
            )}
            {renderEquipeSelect(editData.equipe, (v) => setEditData({ ...editData, equipe: v }))}
            {renderCarteiraSelect(editData.carteira, (v) => setEditData({ ...editData, carteira: v }))}
            {renderObservacaoSelect(editData.observacao, (v) => setEditData({ ...editData, observacao: v }))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPessoa(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PessoasList;
