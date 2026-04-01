

## Plano: Registrar audiências descartadas com log clicável

### Mudanças no arquivo `src/components/ImportacaoSegura.tsx`

**1. Estado para armazenar descartados**
- Novo state `descartados` — array de objetos `{ npc, autor, reu, tipo, motivo }` coletados durante a importação.
- Novo state `showDescartados` (boolean) para controlar a exibição do log.

**2. Captura durante importação (linhas 334-338)**
- Onde hoje faz `continue` para sessões de julgamento, antes do `continue`, fazer `push` no array de descartados com os dados da linha: NPC/Dossiê, Autor, Réu, Tipo da Audiência e Motivo ("Sessão de Julgamento — não é audiência efetiva").

**3. Exibição no resultado da importação (após o bloco de sucesso, ~linha 510-517)**
- Se houver descartados, substituir/complementar a linha de "inconsistências" com um texto clicável: "X registro(s) descartado(s)" com um botão/link discreto "Ver detalhes".
- Ao clicar, abre um Collapsible ou Dialog listando cada registro descartado em uma tabela simples (NPC, Autor, Réu, Tipo, Motivo).

### Detalhes técnicos
- Usar `Collapsible` do shadcn (já existe no projeto) para manter discreto
- Ícone `EyeOff` ou `Filter` do lucide para indicar "descartados"
- Resetar `descartados` no início de cada importação junto com `result`
- Não altera banco de dados — tudo em memória local durante a sessão

