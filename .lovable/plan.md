

## Plano: Sorteio automático pós-importação + Regra de correspondente para audiências presenciais

### Lógica principal

Após a importação da planilha, o sistema executará automaticamente o sorteio para cada audiência importada, com a seguinte distinção:

**Audiência virtual (padrão):** sorteia advogado e preposto internos, respeitando o limite de 2 por semana.

**Audiência presencial** (detectada se `tipo_audiencia` ou `local` contiver "presencial"):
- Não sorteia advogado nem preposto interno.
- Extrai o código do estado do número do processo (padrão `8.XX`).
- Preenche o campo `observacoes` (ou um campo visível no card) com a equipe de correspondente a ser contatada:
  - **RJ (8.19)** → "Contatar Equipe MANA para correspondente"
  - **MG (8.13)** → "Contatar Equipe Mariana Goes para correspondente"
  - **SP (8.26) / Região Sul (PR 8.16, RS 8.21, SC 8.24) / Demais estados** → "Contatar Equipe Thiago para correspondente"

### Mapeamento estado ↔ código do processo

```text
8.01=AC, 8.02=AL, 8.03=AP, 8.04=AM, 8.05=BA, 8.06=CE, 8.07=DF,
8.08=ES, 8.09=GO, 8.10=MA, 8.11=MT, 8.12=MS, 8.13=MG, 8.14=PA,
8.15=PB, 8.16=PR, 8.17=PE, 8.18=PI, 8.19=RJ, 8.20=RN, 8.21=RS,
8.22=RO, 8.23=RR, 8.24=SC, 8.25=SE, 8.26=SP, 8.27=TO
```

Extrair com regex no `numero_processo`: buscar `8\.\d{2}` no texto.

### Regra de equipe

```typescript
function getEquipeCorrespondente(uf: string): string {
  if (uf === "RJ") return "Equipe MANA";
  if (uf === "MG") return "Equipe Mariana Goes";
  return "Equipe Thiago"; // SP, Sul, demais
}
```

### Alterações em `src/components/AudienciasList.tsx`

1. **Após a inserção em batch no `handleConfirmImport`**, buscar as audiências recém-inseridas e executar o sorteio automaticamente:
   - Buscar pessoas ativas (advogados e prepostos).
   - Para cada audiência:
     - Se **presencial**: atualizar `observacoes` com a mensagem de correspondente e marcar status como `'pendente'` (sem atribuição interna).
     - Se **virtual**: sortear advogado + preposto, criar atribuições, marcar status como `'atribuida'`.

2. **Adicionar funções utilitárias** no mesmo arquivo:
   - `isPresencial(audiencia)`: verifica se `tipo_audiencia` ou `local` contém "presencial" (case-insensitive).
   - `extrairUF(numero_processo)`: extrai `8.XX` e retorna a UF correspondente.
   - `getEquipeCorrespondente(uf)`: retorna o nome da equipe.

3. **Atualizar exibição nos cards**: mostrar a informação de correspondente quando for presencial (ex: badge ou texto destacado).

### Arquivos alterados

- `src/components/AudienciasList.tsx` — toda a lógica concentrada aqui.

