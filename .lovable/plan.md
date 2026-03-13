
## Plano: Corrigir Problemas de Upload, Datas e Adicionar Upload Admin

### Problemas Identificados

**1. Datas exibidas incorretamente (dia 31 mostra como dia 30)**
- A coluna `data` no banco e do tipo `date` (sem timezone)
- No `LancamentosTable.tsx`, o `formatDate` faz `new Date(dateStr)` com uma string tipo `"2025-01-31"` 
- JavaScript interpreta isso como UTC meia-noite, e ao converter para horario local (BRT = UTC-3), volta um dia: `2025-01-30 21:00` -> exibe dia 30
- **Correção**: Parsear a data manualmente sem usar `new Date()` para datas no formato `YYYY-MM-DD`

**2. Arquivos XLSX/XML/CSV nao salvam transcricao (chegam como null no n8n)**
- O `process-document-queue` envia o `file_url` (signed URL) ao n8n, mas o n8n precisa baixar e transcrever o arquivo
- Para PDF/imagens o n8n consegue transcrever, mas para XLSX/CSV/XML o n8n retorna `extracted_data: null` ou erro 500
- O `align-document` depende dos `dados_extraidos` para alinhar, que chegam vazios para esses formatos
- **Correção**: No `process-document-queue`, para formatos tabulares (XLSX, CSV, XML), ler o conteudo do arquivo no Edge Function e envia-lo como texto/JSON ao n8n, em vez de apenas a URL
- Isso garante que o n8n receba os dados ja parseados, independente do formato

**3. Admin nao consegue fazer upload de documentos para clientes**
- Nao existe area de upload de lancamentos na tela do admin (`ClientLancamentosDetail`)
- **Correção**: Adicionar o componente `DocumentUploadArea` na tela do admin, permitindo selecionar o cliente e mes

**4. Selecao por conta na tabela**
- Atualmente o "Selecionar todos" seleciona todos os lancamentos de uma vez
- **Correção**: Na visualizacao "Por Conta", adicionar checkbox no header de cada grupo para selecionar todos daquele grupo

---

### Detalhes Tecnicos

#### Arquivo 1: `src/components/admin/lancamentos/LancamentosTable.tsx`

**Correcao de data (timezone bug):**
```typescript
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  // Para formato YYYY-MM-DD, parsear manualmente para evitar timezone shift
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  // Fallback para outros formatos
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return dateStr;
  }
};
```

**Selecao por grupo (modo "Por Conta"):**
- Adicionar prop `onSelectGroup?: (ids: string[]) => void`
- No header de cada grupo, adicionar checkbox que seleciona/deseleciona todos os itens daquele grupo
- Verificar se todos do grupo estao selecionados para exibir estado checked/indeterminate

#### Arquivo 2: `supabase/functions/process-document-queue/index.ts`

**Suporte a formatos tabulares:**
- Apos upload e antes de enviar ao n8n, verificar a extensao do arquivo
- Para `.xlsx`, `.xls`, `.csv`, `.xml`: baixar o arquivo do storage, parsear o conteudo e enviar como campo `file_content` (texto/JSON) ao n8n
- Para `.pdf`, `.png`, `.jpg`, etc: continuar enviando apenas a signed URL (comportamento atual)
- Usar a biblioteca `xlsx` (ja disponivel no projeto) para parsear Excel e CSV no Edge Function
- Para XML, converter para texto simples

Logica adicionada:
```typescript
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

// Apos gerar signed URL...
const ext = file_name.split('.').pop()?.toLowerCase();
let fileContent = null;

if (['xlsx', 'xls', 'csv', 'xml'].includes(ext)) {
  // Baixar arquivo do storage
  const { data: fileData } = await supabase.storage
    .from('lancamentos')
    .download(storagePath);
  
  if (fileData) {
    if (ext === 'csv') {
      fileContent = await fileData.text();
    } else if (ext === 'xml') {
      fileContent = await fileData.text();
    } else { // xlsx, xls
      const buffer = await fileData.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer));
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      fileContent = JSON.stringify(XLSX.utils.sheet_to_json(firstSheet));
    }
  }
}

// Enviar ao n8n com file_content preenchido
body: JSON.stringify({
  event: 'arquivos-brutos',
  document_id: docId,
  file_url: freshSignedUrl,
  file_content: fileContent,  // dados ja parseados para formatos tabulares
  file_type: ext,
  ...
})
```

#### Arquivo 3: `src/components/admin/lancamentos/ClientLancamentosDetail.tsx`

**Adicionar area de upload para o admin:**
- Importar e adicionar o componente `DocumentUploadArea` na interface do admin
- Posicionar acima da lista de lancamentos, dentro da secao de documentos
- O admin podera fazer upload em nome de qualquer cliente, para o mes selecionado
- Esconder quando o mes estiver fechado

#### Arquivo 4: `supabase/functions/align-document/index.ts`

**Melhorar tratamento de dados extraidos:**
- Verificar se `dados_extraidos` existe antes de enviar ao n8n
- Se `dados_extraidos` for null mas `file_content` estiver disponivel (formatos tabulares), usar `file_content` como dados de entrada
- Enviar o campo `file_content` junto com `dados_extraidos` ao n8n para que o n8n tenha o conteudo do arquivo

---

### Resumo das Mudancas

| Arquivo | Mudanca |
|---------|---------|
| `LancamentosTable.tsx` | Corrigir formatacao de data (timezone), adicionar selecao por grupo |
| `process-document-queue/index.ts` | Parsear XLSX/CSV/XML no Edge Function e enviar conteudo ao n8n |
| `align-document/index.ts` | Enviar `file_content` ao n8n quando `dados_extraidos` for null |
| `ClientLancamentosDetail.tsx` | Adicionar area de upload do admin para clientes |
