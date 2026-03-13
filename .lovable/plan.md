

## Plano: Botão "Extrair Planilha" na aba Audiências

### O que será feito

Adicionar um botão "Extrair Planilha" na aba Audiências que exporta um arquivo `.xlsx` com:

1. **Todas as colunas importadas**: NPC/Dossiê, Autor, Processo, Data, Horário, Tipo da Audiência, Foro, Comarca, Assunto, Carteira, Status, Local, Advogado (original), Preposto (original), Estratégia, Estratégia SMAA, Cliente (Réu), Adv Responsável, Observações, Documentação, Link, Adv do Autor, Contato Cartório.
2. **Colunas adicionais**: "Advogado Atribuído" e "Preposto Atribuído" — preenchidas a partir da tabela `atribuicoes` vinculada.
3. **Correspondente**: Coluna "Observações" ou coluna dedicada com a info de correspondente. Quando houver contratação de correspondente (audiência presencial), a célula será preenchida com **fundo amarelo** usando a lib `xlsx` (cell styling via `xlsx-js-style` ou workaround com `XLSX.utils`).

### Detalhes técnicos

- Usar a lib **`xlsx-js-style`** (fork do SheetJS que suporta estilos de célula) para aplicar `fill: { fgColor: { rgb: "FFFF00" } }` nas células de correspondente.
- O botão será posicionado ao lado do botão de importação existente.
- A exportação usará os dados já carregados no estado (`audiencias` com `atribuicoes` join).

### Arquivo alterado

- **`src/components/AudienciasList.tsx`** — adicionar botão + função `handleExportarPlanilha()`
- **`package.json`** — adicionar dependência `xlsx-js-style`

