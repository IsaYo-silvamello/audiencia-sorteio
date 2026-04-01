

## Plano: Corrigir erro na distribuição — constraint de status

### Problema encontrado

A tabela `audiencias` tem uma constraint (`audiencias_status_check`) que só permite os valores: `pendente`, `atribuida`, `realizada`.

O código de distribuição tenta atualizar o status para `"presencial"` nas audiências presenciais/fora do expediente. Isso causa um erro no banco de dados que interrompe todo o sorteio. São dezenas de erros registrados no log do banco.

### Solução

Duas mudanças necessárias:

**1. Migração: adicionar "presencial" à constraint**

```sql
ALTER TABLE audiencias DROP CONSTRAINT audiencias_status_check;
ALTER TABLE audiencias ADD CONSTRAINT audiencias_status_check 
  CHECK (status IN ('pendente', 'atribuida', 'realizada', 'presencial'));
```

**2. Código: tratar erros individuais sem parar o loop**

Em `src/hooks/useSorteio.ts`, envolver cada `update` da audiência em try/catch individual para que um erro em uma audiência não interrompa as demais. Atualmente, o primeiro erro na atualização de status para "presencial" lança uma exceção que pula todo o `catch` do sorteio.

### Detalhes técnicos

- Arquivo: `src/hooks/useSorteio.ts` (linhas 404-408 e 473-481)
- Migração SQL para alterar a constraint
- Envolver os `await supabase.from("audiencias").update(...)` em blocos try/catch individuais dentro do loop `for`

### Resultado esperado

Após a correção, o sorteio vai processar todas as 237 audiências pendentes da semana 06/04-12/04, atribuindo advogados e prepostos conforme as regras de prioridade, e marcando as presenciais como "presencial" sem erro.

