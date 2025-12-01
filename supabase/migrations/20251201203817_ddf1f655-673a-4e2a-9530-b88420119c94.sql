-- Atualizar políticas RLS para acesso público em todas as tabelas

-- Remover políticas antigas de audiencias
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar audiências" ON public.audiencias;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir audiências" ON public.audiencias;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar audiências" ON public.audiencias;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar audiências" ON public.audiencias;

-- Criar políticas públicas para audiencias
CREATE POLICY "Público pode visualizar audiências"
ON public.audiencias FOR SELECT
TO public
USING (true);

CREATE POLICY "Público pode inserir audiências"
ON public.audiencias FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Público pode atualizar audiências"
ON public.audiencias FOR UPDATE
TO public
USING (true);

CREATE POLICY "Público pode deletar audiências"
ON public.audiencias FOR DELETE
TO public
USING (true);

-- Remover políticas antigas de pessoas
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar pessoas" ON public.pessoas;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir pessoas" ON public.pessoas;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar pessoas" ON public.pessoas;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar pessoas" ON public.pessoas;

-- Criar políticas públicas para pessoas
CREATE POLICY "Público pode visualizar pessoas"
ON public.pessoas FOR SELECT
TO public
USING (true);

CREATE POLICY "Público pode inserir pessoas"
ON public.pessoas FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Público pode atualizar pessoas"
ON public.pessoas FOR UPDATE
TO public
USING (true);

CREATE POLICY "Público pode deletar pessoas"
ON public.pessoas FOR DELETE
TO public
USING (true);

-- Remover políticas antigas de atribuicoes
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar atribuições" ON public.atribuicoes;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir atribuições" ON public.atribuicoes;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar atribuições" ON public.atribuicoes;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar atribuições" ON public.atribuicoes;

-- Criar políticas públicas para atribuicoes
CREATE POLICY "Público pode visualizar atribuições"
ON public.atribuicoes FOR SELECT
TO public
USING (true);

CREATE POLICY "Público pode inserir atribuições"
ON public.atribuicoes FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Público pode atualizar atribuições"
ON public.atribuicoes FOR UPDATE
TO public
USING (true);

CREATE POLICY "Público pode deletar atribuições"
ON public.atribuicoes FOR DELETE
TO public
USING (true);