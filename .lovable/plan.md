

## Plano: Corrigir espelhamento dos dados sem apagar nada

### Problema real

Os 243 registros atuais no banco foram importados com o HEADER_MAP antigo. Campos como `npc_dossie` e `tipo_audiencia` estão `null`. A deduplicação atual usa `npc_dossie + numero_processo` como chave — mas como `npc_dossie` é `null` nos registros antigos, reimportar cria **duplicatas** em vez de atualizar.

### Solução: mudar a chave de deduplicação para `numero_processo`

Ao reimportar, o sistema deve:

1. Buscar registro existente por **`numero_processo`** (não mais `npc_dossie + numero_processo`)
2. Se encontrar, fazer **UPDATE** com todos os campos novos (preenchendo `npc_dossie`, `tipo_audiencia`, etc.)
3. Se houver duplicatas (mesmo `numero_processo` aparece várias vezes), atualizar o primeiro e **deletar os extras**
4. Se não encontrar, fazer **INSERT**

Nenhum dado é apagado automaticamente. Os registros existentes são **complementados** com os dados corretos da planilha.

### Mudança no código

**`src/components/ImportacaoSegura.tsx`** — alterar a lógica de upsert (linhas ~185-200):

```text
Antes:
  if (record.npc_dossie && record.numero_processo) {
    busca por npc_dossie + numero_processo → update ou insert
  }

Depois:
  if (record.numero_processo) {
    busca TODOS por numero_processo
    se encontrou 1+: update o primeiro, delete os extras (duplicatas)
    senão: insert
  } else {
    insert direto
  }
```

### Resultado

A advogada reimporta as mesmas planilhas Seven + eLaw → o sistema encontra os registros pelo `numero_processo` → preenche `npc_dossie`, `tipo_audiencia`, `local` etc. → dashboard espelha tudo corretamente. Dados antigos nunca são perdidos.

### Arquivo alterado
- `src/components/ImportacaoSegura.tsx` — apenas a lógica de deduplicação/upsert

