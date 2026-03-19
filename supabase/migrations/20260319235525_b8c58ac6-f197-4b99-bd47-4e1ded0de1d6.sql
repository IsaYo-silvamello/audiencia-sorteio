CREATE TABLE IF NOT EXISTS public.historico_sorteios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executado_em timestamptz NOT NULL DEFAULT now(),
  total integer NOT NULL DEFAULT 0,
  atribuidas integer NOT NULL DEFAULT 0,
  presenciais integer NOT NULL DEFAULT 0,
  sem_disponivel integer NOT NULL DEFAULT 0,
  detalhes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.historico_sorteios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública" ON public.historico_sorteios FOR SELECT USING (true);
CREATE POLICY "Inserção pública" ON public.historico_sorteios FOR INSERT WITH CHECK (true);