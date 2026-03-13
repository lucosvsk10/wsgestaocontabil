

## Plano: PDF — extração + alinhamento imediato na mesma chamada

### Problema atual

Para PDFs, o fluxo está em duas etapas separadas com delay:
1. `process-document-queue` envia ao n8n → recebe texto extraído → salva em `dados_extraidos`
2. Aguarda 20 segundos → chama `align-document` como função separada

Isso é desnecessário para PDFs. O texto extraído já está disponível, o plano de contas pode ser buscado imediatamente.

### Solução

Para PDFs: após receber o texto extraído do n8n, **na mesma função** `process-document-queue`, buscar o plano de contas e enviar **instantaneamente** o texto + plano de contas de volta ao n8n para alinhamento. Sem delay. Sem chamar outra edge function. Tudo no mesmo request.

### Mudança: `process-document-queue/index.ts`

Após o n8n retornar com sucesso (linha ~149), adicionar lógica condicional:

**Se for PDF:**
1. Salvar `dados_extraidos` normalmente
2. Buscar `planos_contas` do user
3. Gerar signed URL fresca do PDF
4. Enviar **imediatamente** ao n8n com `event: 'alinhamento-documento'` + `dados_extraidos` + `plano_contas` + `file_url`
5. Receber planilha alinhada do n8n
6. Inserir lançamentos em `lancamentos_alinhados` (reutilizando a lógica de conversão que já existe no `align-document`)
7. Marcar `status_alinhamento: 'alinhado'`

**Se NÃO for PDF** (xlsx, csv, etc): manter o fluxo atual com `EdgeRuntime.waitUntil` e delay de 20s chamando `align-document`.

### Detalhes técnicos

- Copiar as funções `convertDate`, `convertValor`, e `extractLancamentos` do `align-document` para o `process-document-queue` (ou importar de shared)
- Remover o `setTimeout` de 20s para o caso de PDFs
- Buscar `planos_contas` e `users` (nome/email) dentro do `process-document-queue` para PDFs
- Inserir em `lancamentos_alinhados` diretamente
- Criar notificação de sucesso/erro

Essencialmente, para PDFs, o `process-document-queue` faz o trabalho completo: extração → salva texto → alinhamento → insere lançamentos. Tudo em sequência, sem delay.

