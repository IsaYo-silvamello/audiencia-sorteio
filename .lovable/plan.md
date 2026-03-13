

## Plan: Import Spreadsheet with Extended Audiencias Fields

### 1. Database Migration — Add New Columns to `audiencias`

Add the following columns (all nullable text, since spreadsheet data may be incomplete):

| Spreadsheet Column | DB Column | Notes |
|---|---|---|
| NPC/DOSSIÊ | `npc_dossie` | New |
| TIPO DA AUDIENCIA | `tipo_audiencia` | New |
| FORO | `foro` | New |
| COMARCA | `comarca` | New |
| CARTEIRA | `carteira` | New |
| LOCAL | `local` | New |
| ADVOGADO | `advogado` | New (text from spreadsheet) |
| PREPOSTO | `preposto` | New (text from spreadsheet) |
| ESTRATÉGIA | `estrategia` | New |
| ESTRATÉGIA SMAA | `estrategia_smaa` | New |
| ADV RESPONSAVEL | `adv_responsavel` | New |
| OBSERVAÇÕES | `observacoes` | New |
| DOCUMENTAÇÃO | `documentacao` | New |
| ADV DO AUTOR | `adv_do_autor` | New |
| CONTATO CARTORIO | `contato_cartorio` | New |

Existing columns already mapped: `numero_processo`, `data_audiencia`, `hora_audiencia`, `autor`, `reu`, `assunto`, `status`, `link`.

Make `numero_processo`, `assunto`, `autor`, `reu` nullable or with defaults since spreadsheet rows may have blanks. Also make `hora_audiencia` and `data_audiencia` nullable to handle incomplete rows.

### 2. Spreadsheet Import Feature in `AudienciasList.tsx`

- Add an "Importar Planilha" button at the top of the list.
- Accept `.xlsx` / `.xls` / `.csv` files via file input.
- Use the `xlsx` library (SheetJS) to parse the file client-side.
- Map spreadsheet columns to database fields by header name matching.
- On import: delete ALL existing `atribuicoes` and `audiencias`, then insert new rows.
- Show a confirmation dialog before replacing data.
- Display a toast with the number of imported rows.

### 3. Update Display

- Show the new fields (tipo_audiencia, foro, comarca, advogado, preposto, etc.) in the audiencia cards.
- The ADVOGADO and PREPOSTO columns from the spreadsheet will be stored as text fields directly on the audiencia (separate from the sorteio/atribuicoes system).

### 4. Dependencies

- Install `xlsx` package for spreadsheet parsing.

### Summary of Changes
- **Migration**: Add ~15 new nullable text columns to `audiencias`, relax NOT NULL on some existing columns.
- **Package**: Add `xlsx`.
- **`AudienciasList.tsx`**: Add import button, file parsing logic, confirmation dialog, and display new fields.

