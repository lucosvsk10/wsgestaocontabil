-- Renomear tabelas para nomes mais descritivos
ALTER TABLE documentos_conciliacao RENAME TO documentos_brutos;
ALTER TABLE lancamentos_processados RENAME TO lancamentos_alinhados;

-- Atualizar a foreign key para o novo nome da tabela
ALTER TABLE lancamentos_alinhados 
  DROP CONSTRAINT IF EXISTS lancamentos_processados_documento_origem_id_fkey;

ALTER TABLE lancamentos_alinhados 
  ADD CONSTRAINT lancamentos_alinhados_documento_origem_id_fkey 
  FOREIGN KEY (documento_origem_id) REFERENCES documentos_brutos(id);

-- Atualizar foreign key do extrato_bancario
ALTER TABLE extrato_bancario 
  DROP CONSTRAINT IF EXISTS fk_extrato_documento;

ALTER TABLE extrato_bancario 
  ADD CONSTRAINT fk_extrato_documento 
  FOREIGN KEY (documento_id) REFERENCES documentos_brutos(id);