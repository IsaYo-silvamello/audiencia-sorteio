

## Plano: Sincronizar aba Audiências após sorteio

### Problema

Após o sorteio, os dados são atualizados no banco (status muda para "atribuida", advogado/preposto são preenchidos), mas a aba Audiências não recarrega porque o `refreshKey` do Dashboard não é incrementado. O componente `SorteioAudiencias` não notifica o Dashboard que houve mudança.

### Solução

Passar um callback `onSorteioComplete` do Dashboard para o `SorteioAudiencias`, que chama `setRefreshKey(k => k + 1)` ao final do sorteio. Isso força todas as abas a recarregarem.

### Arquivos impactados

| Arquivo | Mudança |
|---|---|
| `src/pages/Dashboard.tsx` | Passar prop `onSorteioComplete={handleImportComplete}` ao `SorteioAudiencias` |
| `src/components/SorteioAudiencias.tsx` | Aceitar prop `onSorteioComplete` e chamá-la após `realizarSorteio` concluir com sucesso |

### Detalhes técnicos

1. Em `SorteioAudiencias`, adicionar prop `onSorteioComplete?: () => void`
2. Na função `executar`, após `await realizarSorteio(...)`, chamar `onSorteioComplete?.()`
3. Em `Dashboard.tsx`, passar `onSorteioComplete={handleImportComplete}` onde renderiza `<SorteioAudiencias>`

