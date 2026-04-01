

## Plano: Adicionar loading na Distribuição e Histórico de Distribuições

### Mudanças

**Arquivo: `src/components/SorteioAudiencias.tsx`**

1. Adicionar indicador de loading (spinner + texto) enquanto o sorteio está sendo executado (`status === "executando"`), similar ao progress bar da importação — exibir um bloco com animação e mensagem "Realizando distribuição..."

2. Adicionar seção "Histórico de Distribuições" no final da página, reutilizando o componente `HistoricoSorteios` que já existe mas não está sendo usado nesta tela. Importar e renderizar abaixo dos resultados, com o mesmo estilo de card usado no histórico de importações (ícone History, título, descrição).

### Detalhes técnicos

- Importar `HistoricoSorteios` de `@/components/HistoricoSorteios`
- Importar ícone `Loader2` do lucide-react para o spinner animado
- Quando `status === "executando"`, mostrar um card com `Loader2` animado + `Progress` indeterminado + texto "Realizando distribuição de audiências..."
- Renderizar `<HistoricoSorteios />` dentro de um Card com header similar ao da importação (ícone History + título "Histórico de Distribuições")

