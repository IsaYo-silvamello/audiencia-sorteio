ALTER TABLE audiencias DROP CONSTRAINT IF EXISTS audiencias_status_check;
ALTER TABLE audiencias ADD CONSTRAINT audiencias_status_check 
  CHECK (status IN ('pendente', 'atribuida', 'realizada', 'presencial'));