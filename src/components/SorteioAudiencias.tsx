import { useState, useEffect } from "react";
import { useSorteio, SemanaDisponivel } from "@/hooks/useSorteio";
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
import { Shuffle, AlertCircle, CheckCircle2, XCircle, MapPin, ChevronDown, ChevronUp, CalendarCheck, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const SorteioAudiencias = () => {
  const { status, resultado, realizarSorteio, limpar, semanasDisponiveis, carregarSemanas } = useSorteio();
  const [confirmar, setConfirmar] = useState(false);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [semanaSelecionada, setSemanaSelecionada] = useState<string | null>(null);

  useEffect(() => {
    carregarSemanas();
  }, []);

  const toggleExpand = (id: string) =>
    setExpandidos((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const executar = async () => {
    setConfirmar(false);
    if (semanaSelecionada) {
      await realizarSorteio(semanaSelecionada);
    }
  };

  const semanasNaoSorteadas = semanasDisponiveis.filter((s) => !s.sorteada);
  const semanasSorteadas = semanasDisponiveis.filter((s) => s.sorteada);

  const formatSemana = (inicio: string, fim: string) => {
    const d1 = new Date(inicio + "T00:00:00");
    const d2 = new Date(fim + "T00:00:00");
    return `${format(d1, "dd/MM", { locale: ptBR })} a ${format(d2, "dd/MM/yyyy", { locale: ptBR })}`;
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
                Distribui automaticamente respeitando carteira e limite de 3 por dia
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              O sorteio respeita a <strong>carteira/equipe</strong> de cada advogado e preposto, e o limite de{" "}
              <strong>3 audiências por pessoa por dia</strong>. Audiências presenciais são marcadas para
              correspondente sem sortear ninguém.
            </AlertDescription>
          </Alert>

          {/* Seleção de semana */}
          {semanasNaoSorteadas.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Selecione a semana para sortear:</p>
              <div className="grid gap-2">
                {semanasNaoSorteadas.map((sem) => (
                  <button
                    key={sem.inicio}
                    onClick={() => setSemanaSelecionada(sem.inicio)}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                      semanaSelecionada === sem.inicio
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{formatSemana(sem.inicio, sem.fim)}</p>
                        <p className="text-xs text-muted-foreground">{sem.totalAudiencias} audiências</p>
                      </div>
                    </div>
                    {semanaSelecionada === sem.inicio && (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Nenhuma semana disponível para sorteio. Importe planilhas primeiro.
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => {
                limpar();
                setConfirmar(true);
              }}
              disabled={status === "executando" || !semanaSelecionada}
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

      {/* Semanas já sorteadas */}
      {semanasSorteadas.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Semanas já sorteadas</CardTitle>
                <CardDescription>Histórico de sorteios realizados por semana</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {semanasSorteadas.map((sem) => (
              <div
                key={sem.inicio}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{formatSemana(sem.inicio, sem.fim)}</p>
                    <p className="text-xs text-muted-foreground">{sem.totalAudiencias} audiências</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Sorteado em {sem.dataSorteio
                    ? format(new Date(sem.dataSorteio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    : "—"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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

      {/* Lista detalhada */}
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
              O sorteio vai atribuir as audiências pendentes da semana{" "}
              <strong>
                {semanaSelecionada
                  ? formatSemana(
                      semanaSelecionada,
                      (() => {
                        const d = new Date(semanaSelecionada + "T00:00:00");
                        d.setDate(d.getDate() + 6);
                        return d.toISOString().split("T")[0];
                      })()
                    )
                  : ""}
              </strong>{" "}
              para advogados e prepostos disponíveis. Essa ação não pode ser desfeita automaticamente. Deseja continuar?
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
