

## Plano: Férias e Época de Provas

### O que será feito

Duas novas funcionalidades na gestão de pessoas:

1. **Férias** — marcar período de férias; pessoa não é sorteada durante esse período
2. **Época de Provas** (estagiários) — marcar período com horário reduzido; pessoa não é sorteada para audiências fora do expediente especial

### Alterações no banco de dados

Nova tabela `afastamentos` para armazenar ambos os cenários:

```sql
CREATE TABLE public.afastamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid NOT NULL,
  tipo text NOT NULL, -- 'ferias' ou 'provas'
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  horario_especial_inicio time, -- só para provas (ex: 08:00)
  horario_especial_fim time,    -- só para provas (ex: 14:00)
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.afastamentos ENABLE ROW LEVEL SECURITY;
-- Políticas públicas (mesmo padrão das outras tabelas)
```

### Alterações no sorteio (`useSorteio.ts`)

Ao buscar pessoas ativas, filtrar:

- **Férias**: excluir pessoa se `data_audiencia` estiver entre `data_inicio` e `data_fim` de um afastamento tipo `ferias`
- **Provas**: excluir pessoa se `hora_audiencia` estiver fora do intervalo `horario_especial_inicio`–`horario_especial_fim` de um afastamento tipo `provas` ativo naquela data

Não é necessário "voltar automaticamente" — a lógica verifica a data da audiência contra o período. Acabou o período, a pessoa volta a ser elegível naturalmente.

### Alterações na UI (`AdminPessoasManager.tsx`)

- Adicionar botão de **calendário/férias** em cada card de pessoa
- Ao clicar, abrir dialog para:
  - Selecionar tipo: **Férias** ou **Época de Provas**
  - Informar **data início** e **data fim**
  - Se "Provas": campos de **horário especial** (início/fim)
- Listar afastamentos ativos/futuros da pessoa com opção de remover
- Badge visual no card indicando se a pessoa está em férias ou provas atualmente

### Arquivos impactados

| Arquivo | Mudança |
|---|---|
| **migração SQL** | Criar tabela `afastamentos` com RLS |
| `src/hooks/useSorteio.ts` | Buscar afastamentos e filtrar pessoas no sorteio |
| `src/components/AdminPessoasManager.tsx` | UI para gerenciar férias/provas por pessoa |
| `src/components/PessoasList.tsx` | Badge visual de férias/provas (opcional, somente leitura) |

