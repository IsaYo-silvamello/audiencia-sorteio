

## Plano: Limpar banco inteiro e reimportar

### Situação atual
- 335 registros no banco, sendo 61 sem NPC e ~40 duplicatas (registros antigos sem NPC + novos com NPC do mesmo processo)
- Deveria ter ~277 (205 + 72 das planilhas)

### Ação

**1. Migração SQL — limpar todas as tabelas relacionadas**

```sql
DELETE FROM atribuicoes;
DELETE FROM audiencias;
DELETE FROM historico_importacoes;
DELETE FROM pautas_semanais;
```

Isso zera o banco completamente. Nenhuma estrutura é alterada, apenas os dados são removidos.

**2. Nenhuma mudança de código**

O `ImportacaoSegura.tsx` já está com a deduplicação por `npc_dossie`. Com o banco limpo, ao reimportar as 2 planilhas:
- Planilha 1 (205 registros) → 205 inserts
- Planilha 2 (72 registros) → se tiver NPCs em comum com a planilha 1, faz update; senão, insert
- Total final: ~277 registros, todos com NPC e tipo_audiencia preenchidos

### Resultado
Após reimportar, o dashboard exibirá o total correto com NPC e categorias espelhados da planilha.

