// src/components/SorteioAudiencias.tsx
// Substitui o arquivo atual — usa o hook useSorteio centralizado

import { useState } from "react";
import { useSorteio } from "@/hooks/useSorteio";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Shuffle, AlertCircle, CheckCircle2, XCircle, MapPin, ChevronDown, ChevronUp } from "lucide-react";

const SorteioAudiencias = () => {
  const { status, resultado, realizarSorteio, limpar } = useSorteio();
  const [confirmar, setConfirmar] = useState(false);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) =>
    setExpandidos((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const executar = async () => {
    setConfirmar(false);
    await realizarSorteio();
  };

  return (
    <div className="space-y-6">
      {/* Card principal */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shuffle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Sorteio de Audiências</CardTitle>
              <CardDescription>
                Distribui automaticamente respeitando carteira e limite de {2} por semana
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              O sorteio respeita a <strong>carteira/equipe</strong> de cada advogado e preposto, e o limite de{" "}
              <strong>2 audiências por pessoa por semana</strong>. Audiências presenciais são marcadas para
              correspondente sem sortear ninguém.
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button
              onClick={() => {
                limpar();
                setConfirmar(true);
              }}
              disabled={status === "executando"}
              className="flex-1"
              size="lg"
            >
              <Shuffle className="h-5 w-5 mr-2" />
              {status === "executando" ? "Realizando sorteio..." : "Realizar Sorteio"}
            </Button>
            {resultado && (
              <Button variant="outline" onClick={limpar} size="lg">
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumo do resultado */}
      {resultado && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total pendentes", value: resultado.total, color: "text-foreground" },
            { label: "Atribuídas", value: resultado.atribuidas, color: "text-green-600" },
            { label: "Presenciais", value: resultado.presenciais, color: "text-yellow-600" },
            { label: "Sem disponível", value: resultado.semDisponivel, color: "text-destructive" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lista detalhada com motivo (transparência) */}
      {resultado && resultado.itens.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhes do sorteio</CardTitle>
            <CardDescription>Clique em cada item para ver o motivo da atribuição</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {resultado.itens.map((item) => {
              const expanded = expandidos.has(item.audienciaId);
              const hasAdv = !!item.advogado;
              return (
                <div key={item.audienciaId} className="border rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => toggleExpand(item.audienciaId)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.presencial ? (
                        <MapPin className="h-4 w-4 text-yellow-600 shrink-0" />
                      ) : hasAdv ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.processo}</p>
                        <p className="text-xs text-muted-foreground">{item.carteira || "Sem carteira"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {item.presencial && (
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Presencial</Badge>
                      )}
                      {!item.presencial && hasAdv && (
                        <Badge className="bg-green-100 text-green-800 border-green-300">Atribuída</Badge>
                      )}
                      {!item.presencial && !hasAdv && <Badge variant="destructive">Sem disponível</Badge>}
                      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t bg-muted/30 p-3 space-y-2">
                      {item.advogado && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-background rounded-md">
                            <p className="text-xs font-medium text-primary mb-1">ADVOGADO</p>
                            <p className="text-sm">{item.advogado.nome}</p>
                          </div>
                          <div className="p-2 bg-background rounded-md">
                            <p className="text-xs font-medium text-muted-foreground mb-1">PREPOSTO</p>
                            <p className="text-sm">{item.preposto?.nome}</p>
                          </div>
                        </div>
                      )}
                      {item.equipeRecomendada && (
                        <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
                          Contatar: {item.equipeRecomendada}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground italic border-t pt-2">Motivo: {item.motivo}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Modal de confirmação */}
      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar sorteio</AlertDialogTitle>
            <AlertDialogDescription>
              O sorteio vai atribuir <strong>todas as audiências pendentes</strong> para advogados e prepostos
              disponíveis. Essa ação não pode ser desfeita automaticamente. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executar}>Confirmar sorteio</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SorteioAudiencias;
