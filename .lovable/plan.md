

## Plano: Nova aba "Pauta Atual" no Dashboard

### Objetivo

Criar uma nova aba no menu lateral chamada "Pauta Atual" que oferece uma visão macro da semana corrente, focando nas pendências e mostrando quando a distribuição foi realizada.

### Mudanças

**1. `src/pages/Dashboard.tsx`**
- Adicionar item "Pauta Atual" no `MENU_ITEMS` (key: `pauta`, icon: `FileText`, posição logo após Home)
- Importar e renderizar o novo componente `PautaAtual`

**2. Novo arquivo: `src/components/PautaAtual.tsx`**

Componente dedicado com as seguintes seções:

- **Header**: Título "Pauta Atual" com o período da semana corrente (segunda a sexta)
- **Card "Última Distribuição"**: Busca o registro mais recente de `historico_sorteios` para a semana atual e exibe data/hora formatada, total de audiências distribuídas, atribuídas e presenciais. Se não houver distribuição, exibe mensagem orientando o usuário
- **KPIs resumidos**: Cards com Total de audiências, Completas (advogado + preposto + link/foro OK), Pendentes
- **Tabela de Pendências**: Lista apenas audiências com pelo menos uma pendência (sem advogado, sem preposto, sem link para online, sem foro para presencial, sem horário real). Colunas: NPC, Réu, Data, Hora, Tipo, Pendências (badges). Cada linha clicável para edição (reutilizando o dialog de edição do DashboardHome)
- **Resumo por dia**: Grid mostrando quantidade de audiências por dia da semana (Seg-Sex) com indicador visual de pendências

### Dados consultados

- `audiencias` filtradas pela semana atual (segunda a sexta)
- `historico_sorteios` com `semana_inicio` da semana atual, ordenado por `executado_em DESC`, limit 1
- `pautas_semanais` para status da pauta

### Detalhes técnicos

- Semana fixa na semana corrente (sem navegação de semanas — para isso o usuário usa a Home)
- Reutiliza funções `isPresencial`, `getPendencias`, `categorizar` extraídas ou copiadas do `DashboardHome`
- Dialog de edição inline igual ao do DashboardHome
- Realtime subscription na tabela `audiencias` para atualizar automaticamente

