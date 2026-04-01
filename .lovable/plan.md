

## Plano: Mapear colunas MELI (DataPrazo / Hora do Prazo)

### Problema

A planilha MELI usa nomes de colunas diferentes para data e hora:
- `DataPrazo` (coluna AB) → normalizado para `DATAPRAZO` — **não existe** no HEADER_MAP
- `Hora do Prazo` (coluna AC) → normalizado para `HORA DO PRAZO` — **não existe** no HEADER_MAP

Resultado: 137+ audiências importadas sem data e hora, ficando invisíveis na Pauta Atual.

Outras colunas MELI possivelmente não mapeadas: `ESTADO` (estado/UF), `OBSERVAÇÃO DO PRAZO`/`OBSERVACAO DO PRAZO` (observações).

### Solução

**Arquivo: `src/components/ImportacaoSegura.tsx`**

Adicionar ao `HEADER_MAP`:
```
"DATAPRAZO" → "data_audiencia"
"DATA PRAZO" → "data_audiencia"
"DATA DO PRAZO" → "data_audiencia"
"HORA DO PRAZO" → "hora_audiencia"
"ESTADO" → "estado" (será ignorado pois não existe na tabela, mas podemos mapear para "comarca" ou ignorar)
"OBSERVAÇÃO DO PRAZO" → "observacoes"
"OBSERVACAO DO PRAZO" → "observacoes"
"LOCAL" → "local" (já existe)
```

Também adicionar no `parseExcelDate` suporte ao formato americano curto `M/D/YY` (ex: `4/6/26` → `2026-04-06`), caso o Excel não converta para número serial.

### Após implementação

Será necessário **reimportar as planilhas** para que as 137 audiências MELI recebam a data e hora corretamente.

