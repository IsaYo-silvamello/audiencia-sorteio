import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Users, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Pessoa {
  id: string;
  nome: string;
  tipo: string;
  ativo: boolean;
  documento: string | null;
}

const PessoasList = () => {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "advogado",
    documento: "",
  });
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
      const { error } = await supabase.from("pessoas").insert([formData]);

      if (error) throw error;

      toast({
        title: "Pessoa cadastrada com sucesso",
        description: `${formData.tipo === "advogado" ? "Advogado" : "Preposto"} adicionado ao sistema.`,
      });

      setFormData({ nome: "", tipo: "advogado", documento: "" });
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

  const advogados = pessoas.filter((p) => p.tipo === "advogado");
  const prepostos = pessoas.filter((p) => p.tipo === "preposto");

  return (
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
                {advogados.map((pessoa) => (
                  <div
                    key={pessoa.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">Advogado</Badge>
                      <div>
                        <span className="font-medium block">{pessoa.nome}</span>
                        {pessoa.documento && (
                          <span className="text-sm text-muted-foreground">OAB/CPF: {pessoa.documento}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(pessoa.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
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
                {prepostos.map((pessoa) => (
                  <div
                    key={pessoa.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">Preposto</Badge>
                      <div>
                        <span className="font-medium block">{pessoa.nome}</span>
                        {pessoa.documento && (
                          <span className="text-sm text-muted-foreground">CPF: {pessoa.documento}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(pessoa.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PessoasList;
