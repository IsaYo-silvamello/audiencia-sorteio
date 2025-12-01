-- Tabela de pessoas (advogados e prepostos)
CREATE TABLE public.pessoas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('advogado', 'preposto')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de audiências
CREATE TABLE public.audiencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_processo TEXT NOT NULL,
  data_audiencia DATE NOT NULL,
  hora_audiencia TIME NOT NULL,
  partes TEXT NOT NULL,
  assunto TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'atribuida', 'realizada')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de atribuições (relaciona audiências com pessoas)
CREATE TABLE public.atribuicoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audiencia_id UUID NOT NULL REFERENCES public.audiencias(id) ON DELETE CASCADE,
  pessoa_id UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  semana_inicio DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(audiencia_id)
);

-- Índices para melhor performance
CREATE INDEX idx_audiencias_data ON public.audiencias(data_audiencia);
CREATE INDEX idx_atribuicoes_semana ON public.atribuicoes(semana_inicio);
CREATE INDEX idx_atribuicoes_pessoa ON public.atribuicoes(pessoa_id);

-- Enable Row Level Security
ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audiencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atribuicoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - permitir leitura e escrita para usuários autenticados
CREATE POLICY "Usuários autenticados podem visualizar pessoas"
  ON public.pessoas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem inserir pessoas"
  ON public.pessoas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar pessoas"
  ON public.pessoas FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem deletar pessoas"
  ON public.pessoas FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem visualizar audiências"
  ON public.audiencias FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem inserir audiências"
  ON public.audiencias FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar audiências"
  ON public.audiencias FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem deletar audiências"
  ON public.audiencias FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem visualizar atribuições"
  ON public.atribuicoes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem inserir atribuições"
  ON public.atribuicoes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar atribuições"
  ON public.atribuicoes FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem deletar atribuições"
  ON public.atribuicoes FOR DELETE
  TO authenticated
  USING (true);