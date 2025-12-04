-- Remove unique constraint on audiencia_id to allow multiple atribuicoes per audiencia
ALTER TABLE public.atribuicoes DROP CONSTRAINT IF EXISTS atribuicoes_audiencia_id_key;

-- Add a unique constraint on audiencia_id + pessoa_id to prevent duplicate assignments
ALTER TABLE public.atribuicoes ADD CONSTRAINT atribuicoes_audiencia_pessoa_unique UNIQUE (audiencia_id, pessoa_id);