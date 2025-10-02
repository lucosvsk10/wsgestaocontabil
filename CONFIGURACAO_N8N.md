# Configuração dos Webhooks N8N

Este documento detalha como configurar os webhooks do n8n para integração com o sistema de envio e histórico de documentos.

## 🔗 Endpoints

### 1. Webhook de Upload (Cliente)
- **URL**: `https://pre-studiolx-n8n.zmdnad.easypanel.host/webhook/ws-site`
- **Método**: POST (multipart/form-data)
- **Uso**: Upload de documentos mensais pelos clientes

### 2. Webhook de Listagem (Admin)
- **URL**: `https://pre-studiolx-n8n.zmdnad.easypanel.host/webhook/ws-site-list`
- **Método**: GET
- **Uso**: Consulta de histórico de lançamentos pelo admin

---

## 📤 Webhook 1: Upload de Documentos (POST)

### Configuração no N8N

#### Options → Response
- **Response Mode**: Return response as JSON
- **Response Code**: 200

#### Options → Binary Data
- **Field Name for Binary Data**: `file` ⚠️ **IMPORTANTE**

#### Options → CORS
- **Allowed Origins**: Adicionar domínio do Lovable ou usar `*` para desenvolvimento
  - Exemplo: `https://seu-projeto.lovable.app`
  - Dev: `http://localhost:5173`

### Payload Recebido

```json
{
  "clientId": "uuid-do-cliente",
  "docType": "Extrato | Comprovante | Outro",
  "month": "2025-01",
  "file": <binary-data>
}
```

### Resposta Esperada

```json
{
  "ok": true,
  "protocolId": "identificador-unico-do-registro",
  "storageUrl": "url-para-acessar-arquivo"
}
```

### Workflow Sugerido no N8N

1. **Webhook Node**
   - Method: POST
   - Field Name for Binary Data: `file`

2. **Function Node** (opcional)
   - Processar dados recebidos
   - Validar campos obrigatórios
   - Gerar protocolId único

3. **Storage Node** (Google Drive, S3, etc.)
   - Salvar arquivo no storage
   - Capturar URL do arquivo

4. **Database Node** (Supabase, PostgreSQL, etc.)
   - Inserir registro com metadados:
     - timestamp
     - clientId
     - fileName
     - docType
     - month
     - status: "success"
     - storageUrl
     - protocolId

5. **Response Node**
   - Retornar JSON com ok, protocolId e storageUrl

### Tratamento de Erros

```json
{
  "ok": false,
  "error": "Mensagem de erro"
}
```

---

## 📋 Webhook 2: Histórico de Lançamentos (GET)

### Configuração no N8N

#### Authentication
- **Type**: Header Auth
- **Header Name**: `x-api-key`
- **Expected Value**: `ADMIN_TOKEN` (definir token seguro)

#### Options → Response
- **Response Mode**: Return response as JSON
- **Response Code**: 200

#### Options → CORS
- **Allowed Origins**: Adicionar domínio do Lovable
  - Exemplo: `https://seu-projeto.lovable.app`

### Query Parameters Aceitos

- `clientId` (opcional): Filtrar por ID do cliente
- `month` (opcional): Filtrar por mês (formato: YYYY-MM)
- `docType` (opcional): Filtrar por tipo de documento

**Exemplo**: `/webhook/ws-site-list?clientId=abc123&month=2025-01&docType=Extrato`

### Resposta Esperada

```json
[
  {
    "timestamp": "2025-01-15T14:30:00Z",
    "clientId": "uuid-do-cliente",
    "fileName": "extrato-janeiro.pdf",
    "docType": "Extrato",
    "month": "2025-01",
    "status": "success",
    "storageUrl": "https://storage.example.com/file.pdf",
    "protocolId": "PROTO-123456"
  },
  {
    "timestamp": "2025-01-14T10:20:00Z",
    "clientId": "uuid-do-cliente-2",
    "fileName": "comprovante-pagamento.pdf",
    "docType": "Comprovante",
    "month": "2025-01",
    "status": "success",
    "storageUrl": "https://storage.example.com/file2.pdf",
    "protocolId": "PROTO-123457"
  }
]
```

### Workflow Sugerido no N8N

1. **Webhook Node**
   - Method: GET
   - Header Auth: x-api-key

2. **Function Node**
   - Validar x-api-key
   - Extrair query params (clientId, month, docType)
   - Construir query SQL/filtros

3. **Database Node**
   - Consultar registros no banco
   - Aplicar filtros conforme params

4. **Function Node** (opcional)
   - Formatar resposta
   - Ordenar por timestamp DESC
   - Limitar quantidade (paginação)

5. **Response Node**
   - Retornar array JSON com registros

---

## ⚙️ Configurações Importantes

### Tamanho de Payload

Por padrão, o n8n limita o payload. Para aceitar arquivos até 25MB:

```bash
# Variável de ambiente no host do n8n
N8N_PAYLOAD_SIZE_MAX=26214400
```

### Segurança

1. **x-api-key**: Use um token seguro e único
2. **CORS**: Configure origins específicos em produção
3. **Rate Limiting**: Configure limite de requisições por IP
4. **Validação**: Valide tipos de arquivo e tamanhos no n8n

### Monitoramento

1. Ative logs no n8n para debug
2. Configure alertas para falhas
3. Monitore uso de storage
4. Implemente retry logic para falhas temporárias

---

## 🔧 Alterando URLs no Frontend

### Cliente (Upload)

**Arquivo**: `src/components/client/MonthlyDocumentUpload.tsx`

```typescript
// Linha ~15
const WEBHOOK_URL = "https://seu-dominio-n8n.com/webhook/ws-site";
```

### Admin (Histórico)

**Arquivo**: `src/components/admin/DocumentHistory.tsx`

```typescript
// Linha ~17
const WEBHOOK_LIST_URL = "https://seu-dominio-n8n.com/webhook/ws-site-list";

// Linha ~21
const API_KEY = "SEU_TOKEN_SEGURO";
```

---

## 🧪 Testes

### Testar Upload (cURL)

```bash
curl -X POST https://pre-studiolx-n8n.zmdnad.easypanel.host/webhook/ws-site \
  -F "file=@/caminho/arquivo.pdf" \
  -F "clientId=test-uuid" \
  -F "docType=Extrato" \
  -F "month=2025-01"
```

### Testar Listagem (cURL)

```bash
curl -X GET "https://pre-studiolx-n8n.zmdnad.easypanel.host/webhook/ws-site-list?month=2025-01" \
  -H "x-api-key: ADMIN_TOKEN"
```

---

## 📝 Checklist de Implementação

- [ ] Criar workflow de upload no n8n
- [ ] Configurar Field Name for Binary Data = `file`
- [ ] Configurar CORS no webhook de upload
- [ ] Implementar storage (Drive/S3/etc)
- [ ] Criar banco de dados para logs
- [ ] Implementar resposta com protocolId e storageUrl
- [ ] Criar workflow de listagem no n8n
- [ ] Configurar autenticação x-api-key
- [ ] Implementar query com filtros
- [ ] Testar upload com diferentes tipos de arquivo
- [ ] Testar listagem com filtros
- [ ] Configurar N8N_PAYLOAD_SIZE_MAX
- [ ] Atualizar URLs no frontend
- [ ] Testar integração completa

---

## 🐛 Troubleshooting

### Erro de CORS
- Verifique se o domínio está configurado em Allowed Origins
- Em dev, use `*` temporariamente

### Arquivo não chega ao n8n
- Confirme que Field Name = `file`
- Verifique N8N_PAYLOAD_SIZE_MAX
- Teste com arquivo menor

### 401 Unauthorized no histórico
- Verifique se x-api-key está sendo enviado
- Confirme que o token está correto no n8n

### Timeout no upload
- Aumente timeout do n8n
- Verifique velocidade da conexão
- Implemente retry no frontend (já implementado)

---

## 📚 Referências

- [N8N Webhook Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
- [N8N Binary Data](https://docs.n8n.io/data/binary-data/)
- [N8N Security](https://docs.n8n.io/hosting/security/)
