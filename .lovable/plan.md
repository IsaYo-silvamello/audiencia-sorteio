

## Plano: Limite de 1 audiência por dia por pessoa

### Problema

Atualmente o sistema limita apenas 3 audiências por **semana**, mas permite múltiplas no mesmo dia. Exemplo: Bianca Tranquelin com 2 audiências no dia 07/04 às 09:30 e 10:00.

### Mudança no arquivo `src/hooks/useSorteio.ts`

**1. Adicionar contagem diária além da semanal (linhas 377-384)**
- Criar `contagemDiaria: Record<string, Record<string, number>>` — chave é `pessoaId`, valor é mapa de `data → count`.
- Função `addContagemDiaria(pessoaId, data)` para incrementar.

**2. Filtrar por limite diário nos advogados (linhas 457-461)**
- Adicionar condição: `if ((contagemDiaria[a.id]?.[diaAudiencia] || 0) >= 1) return false`
- Mantém o filtro semanal existente (`>= LIMITE_SEMANAL`).

**3. Filtrar por limite diário nos prepostos (linhas 463-467)**
- Mesma condição: `if ((contagemDiaria[p.id]?.[diaAudiencia] || 0) >= 1) return false`

**4. Atualizar `addContagem` (linhas 502-503)**
- Após atribuir advogado/preposto, chamar `addContagemDiaria` além do `addContagem` semanal.

**5. Carregar contagem diária das atribuições existentes**
- Ao carregar atribuições da semana (linha 372-379), fazer join com `audiencias` para obter `data_audiencia` e popular `contagemDiaria` com atribuições já existentes.

### Resumo das regras finais
- Máximo **3 audiências por semana** por pessoa (já existe)
- Máximo **1 audiência por dia** por pessoa (novo)

