

## Plano: Campo Equipe + Edição de Pessoas/Audiências + Regra de Equipe no Sorteio

### 1. Migração de banco: adicionar coluna `equipe` na tabela `pessoas`

```sql
ALTER TABLE public.pessoas ADD COLUMN equipe text;
```

### 2. Cadastro de Pessoa (`PessoasList.tsx`) — campo Equipe

Adicionar um `<Select>` com a lista de equipes:
- MELI
- Fraudes e Ilícitos
- Cobrança DCR-PF Superendividados
- Serviços Bancários
- Vivo - Telefônica
- CREDICARD
- JV ITAU BMG
- ContraCobrança DCR - PF
- DCR PF Cobrança
- BRADESCO
- Planos Econômicos

O campo aparece tanto para advogados quanto prepostos. Salvar no campo `equipe` da tabela.

### 3. Edição de Pessoas cadastradas (`PessoasList.tsx`)

Adicionar botão de editar em cada pessoa na lista. Ao clicar, abre um dialog/inline form com os campos preenchidos (nome, documento, tipo, tipo_advogado, estado, valor, equipe). Salva via `supabase.update()`.

### 4. Edição de Audiências (`AudienciasList.tsx`)

Adicionar botão "Editar" no card da audiência. Abre um dialog com os campos editáveis (número processo, data, hora, autor, réu, assunto, link, tipo_audiencia, local, observações, etc.). Salva via `supabase.update()`.

### 5. Regra de Equipe no Sorteio

Na lógica de sorteio (tanto no `AudienciasList.tsx` pós-importação quanto no `NovaAudienciaForm.tsx`), filtrar pessoas pela equipe compatível:

- A `carteira` da audiência indica o cliente (ex: "MELI", "BRADESCO", "Vivo - Telefônica").
- No sorteio, só sortear advogados/prepostos cuja `equipe` corresponda à `carteira` da audiência.
- Se não houver match exato ou carteira estiver vazia, cair no pool geral (pessoas sem equipe definida ou qualquer disponível).

```typescript
// Pseudocódigo
const carteiraAudiencia = (audiencia.carteira || "").trim().toUpperCase();
const advDisp = advogados.filter(p => {
  const equipe = (p.equipe || "").trim().toUpperCase();
  if (!carteiraAudiencia || !equipe) return true; // sem restrição
  return equipe === carteiraAudiencia;
}).filter(p => (contagem.get(p.id) || 0) < 2);
```

### Arquivos alterados

- **Migração SQL** — adicionar coluna `equipe` em `pessoas`
- **`src/components/PessoasList.tsx`** — campo equipe no form + botão editar + dialog de edição
- **`src/components/AudienciasList.tsx`** — botão editar audiência + dialog de edição + regra de equipe no sorteio
- **`src/components/NovaAudienciaForm.tsx`** — regra de equipe no sorteio individual

