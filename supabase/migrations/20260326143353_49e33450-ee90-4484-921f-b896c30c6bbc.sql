CREATE TABLE public.historico_importacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_importacao timestamptz NOT NULL DEFAULT now(),
  arquivos text NOT NULL DEFAULT '',
  total_registros integer NOT NULL DEFAULT 0,
  inseridos integer NOT NULL DEFAULT 0,
  atualizados integer NOT NULL DEFAULT 0
);

ALTER TABLE public.historico_importacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Público pode visualizar histórico importações" ON public.historico_importacoes FOR SELECT TO public USING (true);
CREATE POLICY "Público pode inserir histórico importações" ON public.historico_importacoes FOR INSERT TO public WITH CHECK (true);