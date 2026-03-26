CREATE TABLE public.pautas_semanais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_inicio date NOT NULL UNIQUE,
  semana_fim date NOT NULL,
  status text NOT NULL DEFAULT 'em_montagem',
  finalizada_em timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pautas_semanais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Público pode visualizar pautas" ON public.pautas_semanais FOR SELECT TO public USING (true);
CREATE POLICY "Público pode inserir pautas" ON public.pautas_semanais FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Público pode atualizar pautas" ON public.pautas_semanais FOR UPDATE TO public USING (true);
CREATE POLICY "Público pode deletar pautas" ON public.pautas_semanais FOR DELETE TO public USING (true);