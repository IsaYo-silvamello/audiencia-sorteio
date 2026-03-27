
CREATE TABLE public.afastamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  horario_especial_inicio time,
  horario_especial_fim time,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.afastamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Público pode visualizar afastamentos" ON public.afastamentos FOR SELECT USING (true);
CREATE POLICY "Público pode inserir afastamentos" ON public.afastamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Público pode atualizar afastamentos" ON public.afastamentos FOR UPDATE USING (true);
CREATE POLICY "Público pode deletar afastamentos" ON public.afastamentos FOR DELETE USING (true);
