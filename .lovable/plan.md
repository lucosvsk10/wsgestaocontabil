

## Plano: Plano de Contas como planilha estruturada com importação XLSX

### Resumo

Reestruturar o Plano de Contas para ser armazenado como JSON estruturado (`[{"codigo": "370", "descricao": "ATIVO"}, ...]`) no campo `conteudo` existente. O modal será reescrito com importação XLSX (detectando colunas "C.R." e "Descrição"), exibição em tabela editável, e o mapeamento será usado automaticamente para preencher descrições de débito/crédito nos lançamentos.

### Mudanças

#### 1. `PlanoContasModal.tsx` - Reescrever completamente

- Substituir o Textarea por uma **tabela interativa** com colunas: "Numero da Conta" e "Descrição"
- Botão **"Importar XLSX"** usando `react-dropzone` + `xlsx`:
  - Detecta automaticamente colunas "C.R." (ou variações como "CR", "Código", "Codigo") e "Descrição" (ou "Descricao")
  - Preenche a lista com os dados importados (merge ou substituição)
- Cada linha editável inline, com botão de remover
- Botão para adicionar linha manualmente
- Campo de busca/filtro
- Salvar como JSON: `[{"codigo": "370", "descricao": "ATIVO"}, ...]`
- Contagem de contas cadastradas no rodapé
- Retrocompatibilidade: ao carregar, reconhecer formatos antigos (`Codigo reduzido`, texto livre) e converter

#### 2. `ClientLancamentosDetail.tsx` - Atualizar parsing

- Atualizar o bloco de parsing (linhas 161-174) para reconhecer o novo formato `{codigo, descricao}` além dos formatos legados
- Lógica: tentar `codigo`/`descricao` primeiro, depois fallback para `Codigo reduzido`/`Descrição`

#### 3. `close-month/index.ts` - Atualizar `buildPlanoContasMap`

- Adicionar suporte ao formato `{codigo, descricao}` na função de parsing, mantendo retrocompatibilidade

#### 4. `align-document/index.ts` - Sem mudanças

O conteúdo raw já é enviado ao n8n como string. O n8n receberá o JSON estruturado diretamente.

### Formato de armazenamento

```json
[
  {"codigo": "370", "descricao": "ATIVO"},
  {"codigo": "371", "descricao": "ATIVO CIRCULANTE"},
  {"codigo": "372", "descricao": "CAIXA"}
]
```

Salvo como `JSON.stringify(array)` no campo `conteudo` (text) da tabela `planos_contas`. Sem alteração de schema no banco.

