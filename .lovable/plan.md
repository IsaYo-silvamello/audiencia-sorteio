

## Plan: Limpar audiências antigas antes de nova importação

### O que muda
Na função de importação (`ImportacaoSegura.tsx`), antes de processar os registros da nova planilha, o sistema irá **deletar todas as audiências existentes** no banco de dados. Assim, cada importação resulta em uma base limpa contendo apenas os dados da planilha recém-importada.

### Technical details

**File: `src/components/ImportacaoSegura.tsx`**

Na função `handleFile`, logo antes do loop `for (const file of Array.from(files))` (linha ~222), adicionar:

```typescript
setImportStatus("Removendo audiências anteriores...");
const { error: deleteError } = await supabase.from("audiencias").delete().neq("id", "00000000-0000-0000-0000-000000000000");
if (deleteError) {
  toast({ title: "Erro ao limpar audiências anteriores", description: deleteError.message, variant: "destructive" });
  setImporting(false);
  return;
}
```

Também limpar as atribuições associadas:
```typescript
await supabase.from("atribuicoes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
```

Isso garante que a cada nova importação, a base parte do zero — sem acúmulo de dados de importações anteriores.

> **Nota:** `.neq("id", "...")` com UUID inexistente é o padrão Supabase para "delete all rows", já que `.delete()` sem filtro é bloqueado pelo SDK.

