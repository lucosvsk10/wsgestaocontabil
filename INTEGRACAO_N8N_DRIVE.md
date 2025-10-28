# Integração n8n - Documentos Processados no Google Drive

## Visão Geral
Esta integração permite que o n8n envie documentos processados salvos no Google Drive para o sistema, criando registros automáticos no banco de dados e notificando os administradores.

## Endpoint do Webhook
```
https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/receive-processed-document
```

## Método HTTP
```
POST
```

## Headers Necessários
```json
{
  "Content-Type": "application/json"
}
```

## Payload JSON

### Campos Obrigatórios
```json
{
  "user_id": "uuid-do-usuario",
  "document_name": "Nome do Documento Processado",
  "drive_url": "https://drive.google.com/file/d/ID_DO_ARQUIVO/view",
  "category": "Documentos Processados"
}
```

### Campos Opcionais
```json
{
  "month": "2025-01",
  "year": 2025,
  "observations": "Documento processado automaticamente via n8n no dia XX/XX/XXXX"
}
```

## Exemplo Completo de Payload
```json
{
  "user_id": "4de8260c-8c4b-42e3-8a48-300d298595e5",
  "document_name": "Relatório Mensal Janeiro 2025",
  "drive_url": "https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j/view",
  "category": "Documentos Processados",
  "month": "2025-01",
  "year": 2025,
  "observations": "Processado automaticamente em 09/01/2025 às 14:30"
}
```

## Respostas da API

### Sucesso (200 OK)
```json
{
  "success": true,
  "document_id": "uuid-do-documento-criado",
  "message": "Documento processado registrado com sucesso"
}
```

### Erro - Campos Faltando (400 Bad Request)
```json
{
  "error": "Campos obrigatórios: user_id, document_name, drive_url, category"
}
```

### Erro - Usuário Não Encontrado (404 Not Found)
```json
{
  "error": "Usuário não encontrado"
}
```

### Erro - Interno do Servidor (500 Internal Server Error)
```json
{
  "error": "Erro ao registrar documento",
  "details": "Detalhes do erro"
}
```

## Fluxo de Funcionamento

1. **Cliente faz upload** de documentos mensais via interface
2. **n8n processa** os documentos (ex: consolidação, análise, etc.)
3. **n8n salva** o arquivo processado no Google Drive
4. **n8n obtém** o link de compartilhamento do Drive
5. **n8n envia webhook** para a Edge Function com os dados
6. **Edge Function** registra o documento no banco de dados
7. **Edge Function** cria notificações para todos os administradores
8. **Admin visualiza** documento com link direto para o Drive

## Configuração no n8n

### 1. Após Processar o Documento
- Salvar o arquivo no Google Drive
- Obter o link de compartilhamento
- Garantir que o link esteja com permissões de visualização adequadas

### 2. Node HTTP Request
- **Method**: POST
- **URL**: `https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/receive-processed-document`
- **Body Content Type**: JSON
- **Body**:
```json
{
  "user_id": "{{ $json.user_id }}",
  "document_name": "{{ $json.document_name }}",
  "drive_url": "{{ $json.drive_url }}",
  "category": "Documentos Processados",
  "observations": "Processado automaticamente via n8n em {{ $now }}"
}
```

### 3. Tratamento de Erros
- Implementar retry em caso de falha
- Logar erros para análise posterior
- Notificar equipe se houver falhas recorrentes

## Visualização no Sistema

### Para Administradores
- Documentos com `drive_url` aparecem com badge azul "Drive"
- Botão especial "Abrir no Drive" ao invés de "Baixar"
- Ícone de link externo para identificação visual

### Para Clientes
- Mesma visualização com badge "Drive"
- Botão azul "Abrir no Drive" em vez do botão de download padrão
- Documento abre diretamente no Google Drive ao clicar

## Benefícios

✅ **Economia de Armazenamento**: Documentos processados ficam no Drive, economizando espaço no Supabase Storage  
✅ **Acesso Direto**: Link direto para o Google Drive, familiar para usuários  
✅ **Histórico Completo**: Registros mantidos no banco de dados para auditoria  
✅ **Automação Simples**: Webhook simples e direto do n8n  
✅ **Notificações Automáticas**: Admins são notificados sobre novos documentos  
✅ **Rastreabilidade**: Observações automáticas com data e origem do processamento

## Troubleshooting

### Erro 400 - Campos Faltando
- Verificar se todos os campos obrigatórios estão presentes no payload
- Confirmar que os valores não são nulos ou vazios

### Erro 404 - Usuário Não Encontrado
- Verificar se o `user_id` existe no sistema
- Confirmar que o UUID está correto e formatado adequadamente

### Erro 500 - Erro ao Criar Categoria
- A categoria será criada automaticamente se não existir
- Verificar logs da Edge Function para mais detalhes

### Documento Não Aparece na Interface
- Verificar se o documento foi criado com sucesso (resposta 200)
- Confirmar que o `user_id` corresponde ao usuário logado
- Atualizar a página ou fazer logout/login

## Logs e Monitoramento

Os logs da Edge Function podem ser acessados em:
```
https://supabase.com/dashboard/project/nadtoitgkukzbghtbohm/functions/receive-processed-document/logs
```

Logs incluem:
- Dados recebidos do webhook
- Validações realizadas
- Erros encontrados
- IDs dos documentos criados
- Status das notificações

## Suporte

Para dúvidas ou problemas, verificar:
1. Logs da Edge Function
2. Console do navegador (erros de frontend)
3. Resposta do webhook no n8n
4. Banco de dados Supabase (tabela `documents`)
