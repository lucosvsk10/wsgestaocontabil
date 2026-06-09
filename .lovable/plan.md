Vou corrigir o download dos documentos enviados para clientes com estes ajustes:

1. **Banco/Storage**
   - Reativar permissão de execução da função `is_admin()` para usuários autenticados, porque a política de leitura do bucket `documents` depende dela.
   - Manter a leitura restrita: administradores podem baixar documentos de qualquer cliente; clientes continuam acessando apenas seus próprios documentos.

2. **Código do download**
   - Alterar `useDocumentManagement.ts` para gerar URL assinada atualizada no momento do clique antes de baixar/abrir o arquivo.
   - Usar fallback seguro para `file_url` quando necessário, evitando depender de URL antiga ou pública em bucket privado.
   - Melhorar a mensagem de erro para mostrar falha real quando o Storage retornar erro vazio (`{}`).

3. **Verificação**
   - Validar as políticas do bucket `documents` após a migração.
   - Testar novamente o fluxo de download na rota atual do admin.