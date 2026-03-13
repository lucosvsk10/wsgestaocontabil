

## Plano: Corrigir processamento de PDFs nos lançamentos

### Problema

O fluxo atual de PDFs falha porque:
1. `process-document-queue` envia o PDF ao n8n, que extrai o texto bruto
2. O sistema salva apenas `n8nData.extracted_data` em `dados_extraidos` — mas para PDFs, o n8n pode retornar o texto em outra chave (ou como resposta direta), resultando em `dados_extraidos = null`
3. `align-document` recebe `null` como dados e envia isso ao n8n com o plano de contas, que falha

### Solução

Para PDFs, salvar o conteúdo completo retornado pelo n8n (texto extraído) no `dados_extraidos`, e na etapa de alinhamento, enviar também a URL assinada do arquivo original para que o n8n possa acessar o PDF diretamente se necessário.

### Mudanças

#### 1. `process-document-queue/index.ts`

- Ao salvar `dados_extraidos`, fazer fallback inteligente: `n8nData.extracted_data || n8nData.text || n8nData.content || n8nData` (salvar a resposta completa do n8n se nenhuma chave específica existir)
- Marcar o `tipo_documento` como `'pdf'` quando a extensão for `.pdf`, para que o `align-document` saiba tratar diferente

#### 2. `align-document/index.ts`

- Para documentos PDF (verificar extensão do `nome_arquivo` ou `tipo_documento`): gerar uma URL assinada fresca do storage e enviar junto ao payload para o n8n
- Enviar `file_url` (signed URL) no payload de alinhamento para que o n8n possa acessar o PDF original
- Incluir `file_type` no payload para o n8n saber que é um PDF

### Detalhes técnicos

**`process-document-queue` — linha 158:**
```
// Antes:
dados_extraidos: n8nData.extracted_data || null

// Depois:
dados_extraidos: n8nData.extracted_data || n8nData.text || n8nData.content || n8nData
```

**`align-document` — antes de enviar ao n8n (linha 252):**
```
// Para PDFs, gerar signed URL fresca
const ext = (doc.nome_arquivo || '').split('.').pop()?.toLowerCase();
let fileUrl = null;
if (ext === 'pdf') {
  const { data: signedUrlData } = await supabase.storage
    .from('lancamentos')
    .createSignedUrl(doc.url_storage, 3600);
  fileUrl = signedUrlData?.signedUrl || null;
}

// Adicionar ao payload:
file_url: fileUrl,
file_type: ext,
```

