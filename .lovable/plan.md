

## Plano: Persistir log de descartados entre navegações

### Problema

Os registros descartados são armazenados em `useState` no componente `ImportacaoSegura.tsx`. Ao trocar de aba, o componente desmonta e o estado é perdido. Ao voltar, a caixa de descartados não aparece mais.

### Solução

Salvar os descartados da última importação no `localStorage`, de modo que ao voltar na aba de importação os dados persistam.

### Mudanças no arquivo `src/components/ImportacaoSegura.tsx`

**1. Inicializar `descartados` a partir do localStorage**
- Ao montar, ler `localStorage.getItem("ultimosDescartados")` e parsear como JSON.
- Se houver dados, popular o state `descartados` e manter `showDescartados = false`.

**2. Salvar no localStorage após importação**
- Ao final da importação (onde hoje faz `setResult`), salvar os descartados coletados em `localStorage.setItem("ultimosDescartados", JSON.stringify(descartados))`.

**3. Limpar ao iniciar nova importação**
- No início de cada importação (onde faz `setDescartados([])`), limpar também o localStorage.

### Detalhes técnicos
- Chave: `"ultimosDescartados"`
- Formato: JSON array de `{ npc, autor, reu, tipo, motivo }`
- Sem alteração visual — mesma Collapsible existente

