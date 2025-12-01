import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CalendarPlus } from "lucide-react";

const NovaAudienciaForm = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    numero_processo: "",
    data_audiencia: "",
    hora_audiencia: "",
    partes: "",
    assunto: "",
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("audiencias").insert([
        {
          ...formData,
          status: "pendente",
        },
      ]);

      if (error) throw error;

      toast({
        title: "Audiência cadastrada com sucesso",
        description: "A audiência foi adicionada ao sistema.",
      });

      setFormData({
        numero_processo: "",
        data_audiencia: "",
        hora_audiencia: "",
        partes: "",
        assunto: "",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar audiência",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarPlus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Cadastrar Nova Audiência</CardTitle>
            <CardDescription>
              Preencha os dados da audiência publicada no DJEN
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero_processo">Número do Processo</Label>
              <Input
                id="numero_processo"
                placeholder="0000000-00.0000.0.00.0000"
                value={formData.numero_processo}
                onChange={(e) =>
                  setFormData({ ...formData, numero_processo: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_audiencia">Data da Audiência</Label>
              <Input
                id="data_audiencia"
                type="date"
                value={formData.data_audiencia}
                onChange={(e) =>
                  setFormData({ ...formData, data_audiencia: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hora_audiencia">Hora da Audiência</Label>
              <Input
                id="hora_audiencia"
                type="time"
                value={formData.hora_audiencia}
                onChange={(e) =>
                  setFormData({ ...formData, hora_audiencia: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="partes">Partes do Processo</Label>
            <Textarea
              id="partes"
              placeholder="Ex: Autor vs. Réu"
              value={formData.partes}
              onChange={(e) => setFormData({ ...formData, partes: e.target.value })}
              required
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assunto">Assunto do Processo</Label>
            <Textarea
              id="assunto"
              placeholder="Descrição do assunto"
              value={formData.assunto}
              onChange={(e) => setFormData({ ...formData, assunto: e.target.value })}
              required
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Cadastrando..." : "Cadastrar Audiência"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default NovaAudienciaForm;
