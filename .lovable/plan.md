

## Plano: Corrigir semanas não aparecendo para sorteio

### Problema

A função `carregarSemanas` em `src/hooks/useSorteio.ts` busca todas as audiências (independente do status) e marca a semana como "sorteada" se já existe entrada em `historico_sorteios`. Assim, semanas com audiências pendentes não aparecem para sortear se já houve um sorteio anterior naquela semana.

### Solução

Alterar `carregarSemanas` para:

1. Buscar apenas audiências com `status = 'pendente'` ao montar a lista de semanas disponíveis
2. Mostrar a semana como disponível se ainda tiver audiências pendentes, mesmo que já tenha sido sorteada antes
3. Manter a indicação de semanas já sorteadas separadamente (para histórico), mas sem bloquear novo sorteio

### Arquivo impactado

`src/hooks/useSorteio.ts` — apenas a função `carregarSemanas` (linhas ~106-151)

### Detalhes técnicos

- Adicionar `.eq("status", "pendente")` na query de audiências dentro de `carregarSemanas`
- Mudar a lógica de `sorteada`: marcar como sorteada apenas se não há mais audiências pendentes naquela semana
- Manter o campo `dataSorteio` para exibir quando foi o último sorteio, mas sem impedir novo sorteio

