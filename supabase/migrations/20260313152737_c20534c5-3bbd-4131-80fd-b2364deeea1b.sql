
-- Add new columns to audiencias
ALTER TABLE public.audiencias
  ADD COLUMN IF NOT EXISTS npc_dossie text,
  ADD COLUMN IF NOT EXISTS tipo_audiencia text,
  ADD COLUMN IF NOT EXISTS foro text,
  ADD COLUMN IF NOT EXISTS comarca text,
  ADD COLUMN IF NOT EXISTS carteira text,
  ADD COLUMN IF NOT EXISTS local text,
  ADD COLUMN IF NOT EXISTS advogado text,
  ADD COLUMN IF NOT EXISTS preposto text,
  ADD COLUMN IF NOT EXISTS estrategia text,
  ADD COLUMN IF NOT EXISTS estrategia_smaa text,
  ADD COLUMN IF NOT EXISTS adv_responsavel text,
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS documentacao text,
  ADD COLUMN IF NOT EXISTS adv_do_autor text,
  ADD COLUMN IF NOT EXISTS contato_cartorio text;

-- Relax NOT NULL constraints on existing columns
ALTER TABLE public.audiencias ALTER COLUMN numero_processo DROP NOT NULL;
ALTER TABLE public.audiencias ALTER COLUMN assunto DROP NOT NULL;
ALTER TABLE public.audiencias ALTER COLUMN autor SET DEFAULT '';
ALTER TABLE public.audiencias ALTER COLUMN reu SET DEFAULT '';
ALTER TABLE public.audiencias ALTER COLUMN hora_audiencia DROP NOT NULL;
ALTER TABLE public.audiencias ALTER COLUMN data_audiencia DROP NOT NULL;
