

## Plano: Adicionar normalização de acentos no match carteira ↔ equipe

### Arquivo impactado

`src/hooks/useSorteio.ts`

### Mudanças

1. Criar função `normalize` que remove diacríticos:
```typescript
function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}
```

2. Atualizar `matchCarteiraEquipe` para usar `normalize()` em vez de `.toUpperCase()`:
- `normalize(carteira)` em vez de `carteira.toUpperCase()`
- `normalize(equipe)` em vez de `equipe.toUpperCase()`
- `normalize()` nos itens do split também

Isso resolve casos como "ITAÚ" vs "ITAU", "ILÍCITOS" vs "ILICITOS", etc.

