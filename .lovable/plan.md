

## Plano: Implementar mapeamento de conglomerados para distribuição

### Problema

O sistema atual compara diretamente o nome do réu com a equipe do advogado. Porém, os clientes são na verdade conglomerados com múltiplas empresas:

- Réu "BANCO ITAU S.A" precisa ser reconhecido como cliente **ITAU**
- Réu "EBAZAR" precisa ser reconhecido como cliente **MELI**
- Réu "TELEFÔNICA BRASIL S.A" precisa ser reconhecido como cliente **VIVO**

Sem esse mapeamento, a distribuição por prioridade de cliente não funciona corretamente.

### Solução

**Arquivo: `src/hooks/useSorteio.ts`**

Criar uma função `identificarCliente(reu: string): string` que recebe o nome do réu e retorna o código do conglomerado:

```text
ITAU  ← contém: ITAU, ITAUCARD, LUIZACRED, MAGAZINE LUIZA
MELI  ← contém: MERCADO, EBAZAR, MELI
VIVO  ← contém: TELEFÔNICA, TELEFONICA, VIVO
BRADESCO ← contém: BRADESCO
ELETROBRÁS ← contém: ELETROBRAS, ELETROBRÁS
HEMERA ← contém: HEMERA
```

Substituir todas as comparações de cliente no fluxo de distribuição para usar essa função, garantindo que:
- Advogado da equipe MELI receba audiências de EBAZAR, MERCADO PAGO, etc.
- Advogado da equipe ITAU receba audiências de LUIZACRED, MAGAZINE LUIZA, ITAUCARD, etc.
- Advogado da equipe VIVO receba audiências de TELEFÔNICA BRASIL, etc.

**Arquivo: `src/components/PautaAtual.tsx`**

Usar a mesma função para exibir o badge de cliente corretamente nos cards de audiência.

### Detalhes técnicos

- Função com matching case-insensitive usando `.toUpperCase()` e `.includes()`
- Fallback: se nenhum conglomerado for identificado, retorna o próprio nome do réu
- Aplicar em: `executarSorteio()` onde compara `equipe` do advogado com o cliente da audiência

