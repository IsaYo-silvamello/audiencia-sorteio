

## Plano: Corrigir Distribuição — Contagem e Atribuição de Colaboradores

### Problema 1: Contagem incorreta (190 vs 124)

Dados reais no banco: **252 pendentes** na semana 16-20/Mar. Dessas, 74 são presenciais e 23 fora do expediente. O número "190 virtuais" que aparece na tela não bate porque a UI mostra o total de audiências sem separar presenciais — o resultado só aparece após o sorteio ser executado.

### Problema 2 (PRINCIPAL): Não está atribuindo colaboradores

A causa raiz é a **lógica de correspondência carteira ↔ equipe**. Dados atuais:

**Carteiras das audiências** (pendentes, virtuais, dentro do expediente):
- MELI: 85, CREDICARD: 17, Cobrança DCR-PF: 19, Fraudes e Ilícitos: 8, Vivo: 5, etc.

**Equipes dos advogados** (40 ativos):
- ITAÚ: 25, MELI: 3, BRADESCO: 3, VIVO: 4, GERAL: 2, ELETROBRÁS: 2, etc.

**Equipes dos prepostos** (38 ativos):
- **31 sem equipe (NULL)**, ITAÚ: 4, GERAL: 3

O código atual faz:
```
se carteira existe E equipe existe → exige match exato
se equipe é NULL → pessoa é EXCLUÍDA (nunca é sorteada)
se carteira é vazia → só pessoas sem equipe entram
```

Resultado: **31 prepostos nunca são sorteados** (equipe NULL), **25 advogados ITAÚ nunca são sorteados** (nenhuma audiência tem carteira "ITAÚ"), e carteiras como CREDICARD/Cobrança DCR-PF não têm nenhum profissional correspondente.

### Solução

Corrigir a lógica de filtro em `useSorteio.ts`:

1. **Prepostos sem equipe** → disponíveis para **qualquer carteira** (são prepostos genéricos)
2. **Advogados/prepostos com equipe "GERAL"** → disponíveis para qualquer carteira
3. **Correspondência flexível** → se a equipe da pessoa **está contida** na carteira da audiência ou vice-versa (ex: equipe "ITAÚ" casa com carteiras que contenham "ITAÚ", como "JV ITAU BMG")
4. **Sem carteira na audiência** → qualquer pessoa pode ser sorteada
5. **Sem equipe na pessoa** → pode ser sorteada para qualquer carteira

### Arquivo impactado

`src/hooks/useSorteio.ts` — apenas a função de filtro de advogados/prepostos disponíveis (linhas 268-279)

### Detalhes técnicos

Substituir a lógica de match por:

```typescript
function matchCarteiraEquipe(carteira: string | null, equipe: string | null): boolean {
  if (!carteira || !equipe) return true; // sem carteira ou sem equipe → disponível
  const c = carteira.toUpperCase();
  const e = equipe.toUpperCase();
  if (e === "GERAL") return true; // equipe geral atende tudo
  // Match flexível: equipe contida na carteira ou carteira contida na equipe
  // Também suporta equipes com múltiplos valores separados por vírgula
  const equipes = e.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  return equipes.some(eq => c.includes(eq) || eq.includes(c));
}
```

E atualizar os filtros de `advDisponiveis` e `prepDisponiveis` para usar essa função.

