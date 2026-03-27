

## Plano: Corrigir Regras de Distribuição

### Mudanças

**1. Limite semanal de 3 (não diário)**

Trocar a contagem por dia (`contagemDiaria`) por contagem por semana. Cada pessoa (advogado ou preposto) pode ter no máximo 3 audiências **por semana**.

**2. Audiências fora do expediente (9:00–18:00) → correspondente externo**

Além de audiências presenciais, audiências com horário antes das 09:00 ou após as 18:00 também devem ser tratadas como correspondente externo, seguindo a mesma lógica de roteamento por UF.

**3. Sem advogado disponível → atribuir só preposto + correspondente**

Se não há advogado disponível mas há preposto, a audiência recebe o preposto e marca que precisa de correspondente para o advogado (seguindo regra de UF).

**4. Sem preposto disponível → atribuir só advogado + correspondente**

Se não há preposto disponível mas há advogado, a audiência recebe o advogado e marca que precisa de correspondente para o preposto.

### Arquivo impactado

`src/hooks/useSorteio.ts` — único arquivo a ser alterado.

### Detalhes técnicos

- Renomear `LIMITE_DIARIO` → `LIMITE_SEMANAL = 3`
- Substituir `contagemDiaria` (por dia) por `contagemSemanal` (total por pessoa na semana)
- Adicionar função `foraDoExpediente(hora: string): boolean` que retorna `true` se `hora < "09:00"` ou `hora >= "18:00"`
- No loop de audiências, antes da verificação presencial, checar `foraDoExpediente` e tratar como correspondente
- Quando `advDisponiveis.length === 0` e `prepDisponiveis.length > 0`: atribuir preposto, marcar correspondente para advogado
- Quando `prepDisponiveis.length === 0` e `advDisponiveis.length > 0`: atribuir advogado, marcar correspondente para preposto
- Atualizar mensagens/motivos para refletir cada cenário

