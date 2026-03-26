

## Plano: Ajustar tabela de KPIs e categorias de audiência

### Mudanças

**1. Atualizar categorias de audiência** (função `categorizar` e tipos)

Substituir o tipo `Categoria` atual por categorias mais granulares:
- Conciliatória Online / Conciliatória Presencial
- AIJ Online / AIJ Presencial
- SE Online / SE Presencial
- ACIJ Online / ACIJ Presencial
- Outros (mantido como fallback)

A função `categorizar()` será atualizada para detectar "endividamento" → SE, "ACIJ" → ACIJ, separando online/presencial em cada caso.

**2. Reorganizar colunas da tabela expandida dos KPIs**

Nova ordem: NPC / Réu / Data / Hora / Categoria / Advogado / Preposto / Link (só online) / Pendências

- Separar Data e Hora em colunas distintas
- Remover "Autor x Réu" e mostrar apenas **Réu**
- Coluna **Link** mostra o link clicável para online, ou "—" para presencial
- Remover coluna Link/Foro combinada; foro fica apenas nas pendências

**3. Adicionar alerta de audiências online sem link**

Já existe no código atual (linha 151-152). Confirmar que está funcionando — o alerta `audiências online sem link` já é gerado. Nenhuma mudança necessária aqui.

### Arquivo alterado
- `src/components/DashboardHome.tsx`

### Detalhes técnicos
- Novo tipo: `"concil_online" | "concil_presencial" | "aij_online" | "aij_presencial" | "se_online" | "se_presencial" | "acij_online" | "acij_presencial" | "outros"`
- Regex para ACIJ: `tipo.includes("acij")` ou `tipo.includes("audiência complementar")`
- Regex para SE: `tipo.includes("endividamento") || tipo.includes(" se ")`

