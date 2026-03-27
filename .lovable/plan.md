

## Plan: Remove "Importar Planilha" button from Audiências tab

### What changes
In `src/components/AudienciasList.tsx`, remove the file import functionality (the "Importar Planilha" button and its associated logic) from the Audiências tab. The audiências data will only come from what was imported via the "Importar Pauta" tab (the `ImportacaoSegura` component).

### Technical details

**File: `src/components/AudienciasList.tsx`**

1. **Remove the "Importar Planilha" button** (lines 683-697) — the hidden file input and the button that triggers it
2. **Remove unused state and refs**: `importing`, `showConfirm`, `pendingRows`, `fileInputRef`
3. **Remove the `handleFileSelect` function** (lines 308-349) — file reading and parsing logic
4. **Remove the `handleConfirmImport` function** (lines 351-469) — import + auto-sorteio logic
5. **Remove the confirmation AlertDialog** that asks to confirm import (search for `showConfirm` usage in the JSX)
6. **Remove unused imports**: `Upload`, `useRef`, `XLSX` (if only used by import), `HEADER_MAP`, `parseExcelDate`, `parseExcelTime`, helper functions only used by import (`isPresencial`, `extrairUF`, `getEquipeCorrespondente`, `CODIGO_ESTADO`)
7. **Keep**: the "Extrair Planilha" (export) button, search, edit, delete, and all display logic

The audiências list will remain purely a read/display/edit view, showing only data that was imported through the dedicated "Importar Pauta" tab.

