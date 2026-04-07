
Objetivo: corrigir a leitura da Pauta Atual para que ela mostre a distribuição real, não o “advogado responsável original” importado da planilha.

O que confirmei
- Amanda Macedo Dias está com 3 audiências atribuídas internamente na semana:
  - 06/04
  - 08/04
  - 10/04
- Thais Cristina Dias da Silva também está com 3 audiências atribuídas internamente na semana:
  - 06/04
  - 08/04
  - 10/04
- Wesley Araujo está cadastrado como preposto, não como advogado.
- Existe um registro antigo/inativo duplicado do Wesley com variação de espaço no nome, mas o registro ativo dele também é preposto.

Causa do problema
- Em `src/components/PautaAtual.tsx`, a coluna “Advogado” está exibindo `adv_responsavel` em vez de `advogado`.
- Nesse mesmo arquivo, a pendência “Sem advogado” também está sendo validada por `adv_responsavel`, não pela atribuição real do sorteio.
- Em `src/components/CalendarioAudiencias.tsx`, o responsável do dia prioriza `adv_responsavel` antes de `advogado`, o que também distorce a leitura.
- Resultado: a interface faz parecer que Amanda e Thais têm muitas audiências, mas boa parte delas são apenas processos originalmente vinculados a elas na importação, não audiências distribuídas a elas.

Plano de correção
1. Corrigir a Pauta Atual
- Trocar a coluna “Advogado” para mostrar `aud.advogado`.
- Ajustar a regra de pendência para considerar `advogado` como o advogado distribuído.
- Se necessário, exibir `adv_responsavel` em campo separado com rótulo claro, como “Adv. responsável original”.

2. Corrigir o Calendário
- Alterar `getResponsavel()` em `src/components/CalendarioAudiencias.tsx` para priorizar:
  - `advogado`
  - `preposto`
  - e só então `adv_responsavel` como referência original
- Isso evita que o calendário infle artificialmente a carga de Amanda e Thais.

3. Melhorar a nomenclatura da interface
- Diferenciar visualmente:
  - Advogado distribuído
  - Advogado responsável original
- Isso elimina a ambiguidade entre dado importado e dado atribuído pelo sorteio.

4. Revisar o cadastro duplicado do Wesley
- Manter como referência o registro ativo dele como preposto.
- Verificar na tela administrativa se vale ocultar melhor registros inativos ou normalizar nomes para evitar confusão futura.

Arquivos a ajustar
- `src/components/PautaAtual.tsx`
- `src/components/CalendarioAudiencias.tsx`
- possivelmente `src/components/DashboardHome.tsx` apenas para padronizar rótulos, embora ele já use `advogado` corretamente em pendências

Resultado esperado
- Amanda e Thais passarão a aparecer com a carga real da distribuição.
- A Pauta Atual deixará de confundir “responsável original da planilha” com “advogado sorteado”.
- Wesley continuará identificado corretamente como preposto.
