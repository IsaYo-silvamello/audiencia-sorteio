

## Plano: Redesign do Dashboard — Pautas Semanais + Design Acordos Silva Mello

### O que muda

**1. Remover stepper (#1 #2 #3)** e substituir por um **seletor de pauta semanal**.

**2. Seletor de Pauta Semanal**
- Dropdown ou lista de semanas disponíveis (baseado nas datas de audiências existentes no banco)
- Formato: "23/03 à 27/03/2026"
- Semana atual pré-selecionada
- Setas para navegar entre semanas (anterior/próxima)
- Status da semana: "Em montagem" ou "Concluída"
- Botão "Finalizar Pauta" que:
  - Verifica pendências (sem advogado, sem link, sem foro, etc.)
  - Se houver pendências, mostra alerta impedindo finalização
  - Se não houver, marca a semana como concluída

**3. Visão macro da pauta selecionada**
- KPIs da semana (total, atribuídas, pendentes)
- Caixas organizadoras por tipo (mantidas: Conciliatória Online/Presencial, AIJ Online/Presencial, Super Endividamento)
- Alertas de pendências da semana selecionada

**4. Alinhamento visual com Acordos Silva Mello**
- Importar fonte **Inter** via Google Fonts
- Atualizar `index.css` com as cores do projeto Acordos:
  - Background: `39 48% 93%` (tom creme/quente)
  - Primary: `217 91% 60%` (azul vibrante)
  - Sidebar: `213 66% 15%` (azul escuro #0D2740)
  - Adicionar variáveis `--sidebar-*` do Acordos
  - Adicionar variáveis de status e brand
- Atualizar `tailwind.config.ts` com tokens de sidebar, brand, status e font-family Inter

### Estrutura visual

```text
┌──────────────────────────────────────────────────┐
│  Central de Operações                            │
│                                                  │
│  ◄  23/03 à 27/03/2026  ►   [Finalizar Pauta]  │
│     Status: Em montagem                          │
├──────────────────────────────────────────────────┤
│  ⚠ 5 aud. sem advogado  ⚠ 3 online sem link    │
├──────────────────────────────────────────────────┤
│  Total: 32  │ Pendentes: 5 │ Atribuídas: 27     │
├──────────┬──────────┬──────────┬────────┬────────┤
│ Concil.  │ Concil.  │   AIJ    │  AIJ   │ Super  │
│ Online   │Presencial│Presencial│ Online │Endivid.│
│  (14)    │   (3)    │   (5)    │  (8)   │  (2)   │
└──────────┴──────────┴──────────┴────────┴────────┘
```

### Detalhes técnicos

**Banco de dados**: Criar tabela `pautas_semanais` para rastrear status de cada semana:
```sql
create table pautas_semanais (
  id uuid primary key default gen_random_uuid(),
  semana_inicio date not null unique,
  semana_fim date not null,
  status text not null default 'em_montagem', -- 'em_montagem' | 'concluida'
  finalizada_em timestamptz,
  created_at timestamptz default now()
);
```

**Arquivos alterados**:
- `src/components/DashboardHome.tsx` — reescrita: seletor semanal, botão finalizar, validação de pendências
- `src/index.css` — cores e fonte Inter do projeto Acordos Silva Mello
- `tailwind.config.ts` — tokens de sidebar, brand, status, font Inter

