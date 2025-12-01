-- Atualizar tabela audiencias para separar autor e réu
ALTER TABLE audiencias DROP COLUMN IF EXISTS partes;
ALTER TABLE audiencias ADD COLUMN autor TEXT NOT NULL DEFAULT '';
ALTER TABLE audiencias ADD COLUMN reu TEXT NOT NULL DEFAULT '';

-- Atualizar tabela pessoas para adicionar tipo de advogado e campos relacionados
ALTER TABLE pessoas ADD COLUMN tipo_advogado TEXT;
ALTER TABLE pessoas ADD COLUMN estado TEXT;
ALTER TABLE pessoas ADD COLUMN valor_audiencia DECIMAL(10,2);