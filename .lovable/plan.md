

## Plano: Redesign da Dashboard orientada ao fluxo de trabalho

### Contexto do fluxo

A advogada responsável segue este fluxo:
1. **Importa** 2 relatórios (Seven e eLaw)
2. **Sorteia** advogados e prepostos
3. **Visualiza** audiências organizadas por categoria
4. **Verifica** quais pastas estão com informações faltando

O dashboard atual mostra KPIs genéricos e uma tabela por carteira que não reflete esse fluxo. A proposta é reorganizar completamente o `DashboardHome.tsx` para ser uma **central de operações** intuitiva.

### Nova estrutura do Dashboard

```text
┌─────────────────────────────────────────────────┐
│  ETAPAS DO FLUXO (stepper visual)               │
│  ① Importar → ② Sortear → ③ Revisar            │
│  (cada etapa com status: pendente/concluída)     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  ALERTAS: pastas com informações faltando       │
│  "12 audiências sem link"                       │
│  "5 audiências sem advogado/preposto"           │
│  "3 audiências presenciais sem endereço"        │
└─────────────────────────────────────────────────┘

┌──────────┬──────────┬──────────┬──────────┬──────────┐
│ Concil.  │ Concil.  │   AIJ    │   AIJ    │  Super   │
│ Online   │Presencial│Presencial│  Online  │Endivid.  │
│   (14)   │   (3)    │   (5)    │   (8)    │   (2)    │
└──────────┴──────────┴──────────┴──────────┴──────────┘
  (cards clicáveis que expandem a lista de audiências)

┌─────────────────────────────────────────────────┐
│  RESUMO: KPIs compactos (total, pendentes,      │
│  atribuídas, taxa realização)                   │
└─────────────────────────────────────────────────┘
```

### O que será feito

#### 1. Reescrever `src/components/DashboardHome.tsx`

**Seção: Stepper de fluxo**
- 3 etapas visuais: Importar, Sortear, Revisar
- Cada uma detecta automaticamente se foi feita (ex: há audiências importadas? há atribuições?)
- Botões de ação rápida em cada etapa (link para a aba correspondente)

**Seção: Caixas organizadoras por tipo de audiência**
- 5 cards coloridos categorizando audiências pelo campo `tipo_audiencia` e `local`:
  - **Conciliatória Online**: tipo contém "concilia" e não é presencial
  - **Conciliatória Presencial**: tipo contém "concilia" e é presencial
  - **AIJ Presencial**: tipo contém "instrução"/"AIJ" e é presencial
  - **AIJ Online**: tipo contém "instrução"/"AIJ" e não é presencial
  - **Super Endividamento**: tipo contém "endividamento"
- Cada card mostra quantidade e, ao clicar, expande listando as audiências daquela categoria com advogado/preposto atribuído
- Cards com cores distintas e ícones

**Seção: Alertas de informações faltando**
- Consulta audiências que não têm:
  - Advogado ou preposto atribuído (sem registro em `atribuicoes`)
  - Link (campo `link` vazio em audiências online)
  - Endereço/foro (campo `foro` vazio em audiências presenciais)
- Cada alerta mostra quantidade e permite clicar para ver a lista

**Seção: KPIs compactos**
- Manter os KPIs atuais mas em formato mais compacto (linha única)

#### 2. Arquivo alterado
- `src/components/DashboardHome.tsx` — reescrita completa

### Detalhes técnicos

- A categorização usará regex no campo `tipo_audiencia` para classificar: `/concilia/i`, `/instru|aij/i`, `/endividamento/i`
- A detecção presencial/online usa a função `isPresencial` já existente (verifica `tipo_audiencia` e `local`)
- Os cards expandíveis usarão `Collapsible` do shadcn/ui
- Busca todas audiências com joins em `atribuicoes → pessoas` para mostrar advogado/preposto em cada card
- Filtro temporal dia/semana/mês mantido para as caixas organizadoras
- O stepper verificará: etapa 1 OK se `audiencias.length > 0`, etapa 2 OK se existem registros em `atribuicoes`, etapa 3 OK se não há alertas pendentes

