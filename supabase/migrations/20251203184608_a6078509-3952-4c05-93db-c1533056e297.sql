-- Inserir os lançamentos extraídos do documento 20e19573-1cfc-494c-b734-70c45f48ec84
INSERT INTO lancamentos_alinhados (user_id, competencia, documento_origem_id, data, historico, valor)
SELECT 
  '4de8260c-8c4b-42e3-8a48-300d298595e5'::uuid,
  '2025-12',
  '20e19573-1cfc-494c-b734-70c45f48ec84'::uuid,
  TO_DATE(item->>'data', 'DD/MM/YYYY'),
  item->>'historico',
  (item->>'valor')::numeric
FROM documentos_brutos,
     jsonb_array_elements(dados_extraidos) AS item
WHERE id = '20e19573-1cfc-494c-b734-70c45f48ec84';