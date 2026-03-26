

## Plano: Corrigir mapeamento de importação para planilhas Seven e eLaw

### Problema identificado

O `HEADER_MAP` atual espera cabeçalhos como "NPC/DOSSIÊ", "AUTOR", "PROCESSO", "DATA", "HORÁRIO", "TIPO DA AUDIÊNCIA" — mas **nenhum desses existe** nas planilhas reais.

**Cabeçalhos reais da planilha Seven:**
- `NPC` → npc_dossie
- `Data/Hora Prazo` → data_audiencia
- `Hora do compromisso` → hora_audiencia
- `Sub Tipo Compromisso` → tipo_audiencia (ex: "Conciliatória virtual", "Conciliatória presencial")
- `Parte Cliente` → reu (cliente = réu)
- `Parte Adversa` → autor
- `Número do Processo` → numero_processo
- `Comarca` → comarca
- `Foro` → foro
- `Assunto` → assunto
- `Carteira` → carteira
- `Estratégia` → estrategia
- `Advogado Adverso` → adv_do_autor
- `Adv. Responsável Processo` → adv_responsavel
- `Observação Processo` → observacoes
- `ID Processo` → id_planilha
- `Status do Compromisso` → status

**Cabeçalhos reais da planilha eLaw:**
- `NPC` → npc_dossie
- `DataPrazo` → data_audiencia
- `Hora do Prazo` → hora_audiencia
- `Sub Tipo Compromisso` → tipo_audiencia (ex: "CONCILIATÓRIA VIRTUAL", "CONCILIATÓRIA PRESENCIAL", "AUDIÊNCIA CONCILIAÇÃO, INSTRUÇÃO E JULGAMENTO - PRESENCIAL")
- `Parte Cliente` → reu
- `Parte Adversa` → autor
- `Número do Processo` → numero_processo
- `Comarca` → comarca
- `Foro` → foro
- `Assunto` → assunto
- `Estratégia` → estrategia
- `Advogado Adverso` → adv_do_autor
- `Adv. Responsável Processo` → adv_responsavel
- `Observação Processo` → observacoes
- `ID Processo` → id_planilha
- `Status do Prazo` → status
- `local` → local
- `Estado` → (campo novo ou ignorar)
- `Observação do Prazo` → (pode conter link/endereço da audiência)

### Mudanças

**1. Reescrever o `HEADER_MAP` em `ImportacaoSegura.tsx`**

Substituir completamente o mapeamento para cobrir os cabeçalhos reais de ambos os sistemas, mantendo os antigos como fallback:

```text
"NPC"                        → npc_dossie
"DATA/HORA PRAZO"            → data_audiencia  (Seven)
"DATAPRAZO"                  → data_audiencia  (eLaw)
"HORA DO COMPROMISSO"        → hora_audiencia  (Seven)
"HORA DO PRAZO"              → hora_audiencia  (eLaw)
"SUB TIPO COMPROMISSO"       → tipo_audiencia
"PARTE CLIENTE"              → reu
"PARTE ADVERSA"              → autor
"NÚMERO DO PROCESSO"         → numero_processo
"NUMERO DO PROCESSO"         → numero_processo
"COMARCA"                    → comarca
"FORO"                       → foro
"ASSUNTO"                    → assunto
"CARTEIRA"                   → carteira
"ESTRATÉGIA"/"ESTRATEGIA"    → estrategia
"ADVOGADO ADVERSO"           → adv_do_autor
"ADV. RESPONSÁVEL PROCESSO"  → adv_responsavel
"OBSERVAÇÃO PROCESSO"        → observacoes
"OBSERVACAO PROCESSO"        → observacoes
"ID PROCESSO"                → id_planilha
"STATUS DO COMPROMISSO"      → status  (Seven)
"STATUS DO PRAZO"            → status  (eLaw)
"LOCAL"                      → local
"OBSERVAÇÃO DO PRAZO"        → observacoes (eLaw - fallback)
+ manter os mapeamentos antigos como fallback
```

**2. Normalizar `tipo_audiencia` na importação**

O campo `Sub Tipo Compromisso` já traz valores como:
- "Conciliatória virtual" / "CONCILIATÓRIA VIRTUAL"
- "Conciliatória presencial" / "CONCILIATÓRIA PRESENCIAL"
- "AUDIÊNCIA CONCILIAÇÃO, INSTRUÇÃO E JULGAMENTO - PRESENCIAL"

Esses valores alimentam diretamente a função `categorizar()` no dashboard, que já faz `.toLowerCase()` e busca por "concilia", "instru", "presencial", "virtual". Funciona sem alteração.

**3. Normalizar status na importação**

Mapear "Pendente" → "pendente", "Concluído" → "realizada", etc., para manter consistência com o banco.

**4. Tratar deduplicação**

Ambas as planilhas podem trazer a mesma audiência. Usar `npc_dossie + numero_processo` como chave: antes de inserir, verificar se já existe registro com mesmo NPC e processo. Se existir, fazer `update` ao invés de `insert` para complementar dados.

### Arquivo alterado
- `src/components/ImportacaoSegura.tsx` — reescrever HEADER_MAP e lógica de insert/upsert

### Resultado esperado
Após reimportar as planilhas, o dashboard exibirá corretamente: NPC, tipo de audiência (online/presencial), categoria, autor, réu, comarca, foro e demais campos.

