

## Plano: Usar NPC como chave de deduplicação

### Mudança

Trocar a chave de deduplicação de `numero_processo` para `npc_dossie` em `src/components/ImportacaoSegura.tsx`.

O NPC é único por audiência e vem preenchido nas duas planilhas (Seven e eLaw), tornando a correspondência muito mais confiável.

### Lógica nova

```text
if (record.npc_dossie) {
  busca por npc_dossie (mesma semana)
  se encontrou → UPDATE o primeiro, delete extras
  senão → INSERT
} else {
  INSERT direto
}
```

### Migração SQL — limpar dados antigos

Como os registros atuais no banco têm `npc_dossie = NULL` (importação antiga quebrada), ao reimportar com NPC como chave, o sistema não vai encontrar correspondência e vai inserir novos. Precisamos limpar as duplicatas existentes:

```sql
-- Remover registros fantasma sem numero_processo
DELETE FROM atribuicoes WHERE audiencia_id IN (SELECT id FROM audiencias WHERE numero_processo IS NULL);
DELETE FROM audiencias WHERE numero_processo IS NULL;

-- Remover duplicatas: para cada numero_processo, manter apenas 1
DELETE FROM atribuicoes WHERE audiencia_id IN (
  SELECT id FROM audiencias WHERE id NOT IN (
    SELECT DISTINCT ON (numero_processo) id FROM audiencias ORDER BY numero_processo, created_at DESC
  )
);
DELETE FROM audiencias WHERE id NOT IN (
  SELECT DISTINCT ON (numero_processo) id FROM audiencias ORDER BY numero_processo, created_at DESC
);
```

Isso reduz o banco para ~277 registros únicos. Ao reimportar, o sistema encontra pelo NPC e faz UPDATE com todos os campos corretos.

### Arquivo alterado
- `src/components/ImportacaoSegura.tsx` — trocar deduplicação de `numero_processo` para `npc_dossie`

