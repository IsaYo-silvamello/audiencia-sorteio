-- Adicionar coluna documento (OAB/CPF) na tabela pessoas
ALTER TABLE public.pessoas 
ADD COLUMN documento TEXT;

-- Adicionar índice para melhorar performance de busca
CREATE INDEX idx_pessoas_documento ON public.pessoas(documento);