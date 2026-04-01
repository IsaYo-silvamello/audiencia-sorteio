

## Plano: Corrigir placeholder de horário que impede distribuição

### Problema

182 audiências da semana 06/04-12/04 têm `hora_audiencia = '00:01:00'` (valor placeholder importado da planilha). A função `foraDoExpediente()` trata isso como "antes das 09:00" e encaminha para correspondente, impedindo a distribuição para advogados/prepostos.

### Solução

Em `src/hooks/useSorteio.ts`, atualizar a função `foraDoExpediente` para ignorar horários placeholder conhecidos (`00:00:00`, `00:01:00`, `23:59:00`). Esses valores não representam horários reais e devem ser tratados como "horário desconhecido" (dentro do expediente por padrão).

### Mudança

**Arquivo:** `src/hooks/useSorteio.ts` (linhas 66-69)

Alterar de:
```typescript
function foraDoExpediente(hora: string | null): boolean {
  if (!hora) return false;
  return hora < "09:00" || hora >= "18:00";
}
```

Para:
```typescript
function foraDoExpediente(hora: string | null): boolean {
  if (!hora) return false;
  // Ignorar horários placeholder da planilha
  const placeholders = ["00:00:00", "00:01:00", "23:59:00", "00:00", "00:01", "23:59"];
  if (placeholders.includes(hora)) return false;
  return hora < "09:00" || hora >= "18:00";
}
```

### Resultado esperado

As 179 audiências virtuais com horário "00:01:00" passarão a ser distribuídas normalmente para advogados e prepostos. Apenas audiências com horário real fora do expediente (ex: 07:30, 19:00) serão encaminhadas para correspondente.

### Ação necessária antes de re-testar

Como as 237 audiências já foram marcadas como "presencial" no banco, será preciso resetá-las para "pendente" para poder redistribuir. Isso será feito via migração SQL:
```sql
UPDATE audiencias SET status = 'pendente', observacoes = NULL 
WHERE data_audiencia >= '2026-04-06' AND data_audiencia <= '2026-04-12' 
AND status = 'presencial';
```

Também limpar o registro do histórico de sorteios dessa semana e as atribuições correspondentes.

