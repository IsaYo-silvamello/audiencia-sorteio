
Problema identificado: você tem razão em apontar esse exemplo. O NPC 1174261 existe no banco com data 10/04 às 08:05, mas ele não deveria ter entrado como audiência atribuída da Amanda porque está marcado como fora do expediente, então foi tratado como correspondente externo. O ponto mais importante que achei é outro: hoje o sistema está inconsistente na definição de “semana”, o que pode fazer a conferência parecer errada e também pode afetar limites dependendo da tela.

O que encontrei no código:
- `useSorteio.ts`: a função `getInicioSemana()` calcula a semana começando na segunda-feira.
- `PautaAtual.tsx` e `DashboardHome.tsx`: usam `weekStartsOn: 0`, ou seja, domingo.
- `CalendarioAudiencias.tsx`: usa `weekStartsOn: 1`, ou seja, segunda.

Isso entra em conflito com a regra de negócio já registrada no projeto: domingo a sábado.

Caso citado por você:
- NPC `1174261`
- Data: `2026-04-10`
- Hora: `08:05`
- Réu: `EBAZAR`
- Status atual: `presencial`
- Advogado: vazio
- Preposto: vazio

Ou seja: esse caso não foi “percebido como da Amanda”; ele caiu na regra de fora do expediente. Ainda assim, seu alerta mostrou um problema real: a auditoria anterior ficou incompleta porque não validou a semana inteira com a mesma lógica usada pelo sistema.

Plano de correção:
1. Unificar a regra semanal em todo o projeto para domingo a sábado
- Ajustar `getInicioSemana()` em `src/hooks/useSorteio.ts` para retornar domingo.
- Garantir que todas as telas que exibem semana usem a mesma convenção.
- Corrigir especialmente `src/components/CalendarioAudiencias.tsx`, que hoje usa segunda-feira.

2. Corrigir a seleção e a auditoria de limites
- Revisar a lógica que monta `contagemSemanal` e `contagemDiaria` em `src/hooks/useSorteio.ts`.
- Confirmar que o limite de 3 por semana e 1 por dia seja aplicado com base no intervalo domingo → sábado.
- Fazer a contagem considerar também atribuições já existentes da mesma semana, sem divergência de faixa.

3. Deixar explícita a regra de fora do expediente
- Manter a regra atual de bloquear horários antes de 09:00 e após/às 18:00.
- Melhorar o motivo salvo/exibido para esses casos, para ficar claro que não entram na distribuição interna.
- Isso evita confusão quando o usuário procurar um NPC que existe na pauta, mas foi encaminhado a correspondente.

4. Melhorar a conferência visual
- Em `PautaAtual.tsx` e/ou no resultado da distribuição, exibir com mais clareza:
  - distribuídas internamente
  - encaminhadas para correspondente por horário
  - presenciais
  - sem disponível
- Assim fica mais fácil entender por que um caso apareceu na semana, mas não entrou para advogado/preposto.

5. Auditoria pós-ajuste
- Validar novamente profissionais como Amanda Macedo Dias com base na semana correta.
- Conferir se há qualquer pessoa com:
  - mais de 3 audiências na semana
  - mais de 1 no mesmo dia
  - audiência interna antes de 09:00 ou a partir de 18:00

Arquivos a ajustar:
- `src/hooks/useSorteio.ts`
- `src/components/PautaAtual.tsx`
- `src/components/DashboardHome.tsx`
- `src/components/CalendarioAudiencias.tsx`

Detalhes técnicos:
- Hoje há um bug de consistência temporal, não necessariamente apenas de distribuição.
- A UI mostra semanas com base em domingo→sábado em algumas telas, enquanto o sorteio usa segunda→domingo.
- Isso pode distorcer tanto a leitura humana quanto a validação automática dos limites.
- O exemplo do NPC 1174261 reforça que precisamos separar claramente:
  - casos da semana
  - casos distribuíveis internamente
  - casos excluídos da distribuição por regra de expediente

Resultado esperado após implementação:
- Todas as telas e o sorteio falarão a mesma língua sobre “semana”.
- A auditoria de carga da Amanda e dos demais ficará confiável.
- Casos fora do expediente, como o NPC 1174261 às 08:05, continuarão fora da distribuição interna, mas aparecerão com justificativa mais clara.
