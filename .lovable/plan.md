## Objetivo

1. Simplificar todo o pipeline para trabalhar **apenas com o C.R. (Código Reduzido)** do plano de contas — remover conceito de "código completo" / "preferência da IA".
2. No processamento de **folha de pagamento** (só folha, não compras/fiscal), fazer a IA gerar:
   - Uma **nova coluna "Justificativa"** por linha explicando de onde saiu do PDF e, quando aplicável, quais valores foram somados/unificados.
   - Um campo global de **Observações da IA** (dúvidas ou justificativas incomuns) exibido no editor.

---

## 1. Plano de contas: apenas C.R.

**Arquivos:** `src/lib/planoContas.ts`, `supabase/functions/_shared/planoContas.ts`, `src/components/admin/lancamentos/PlanoContasModal.tsx`.

- Remover o campo `codigo_completo` e o tipo `PlanoContasPreferencia` de ambos os arquivos compartilhados. Item passa a ser `{ cr, descricao }`.
- `parsePlanoContasContent` / `parsePlanoContas`:
  - Aceitar o formato antigo (com `codigo_completo` e/ou `preferencia_ia`) apenas para **ler** dados já salvos — descartar `codigo_completo` e ignorar `preferencia_ia`, mantendo compatibilidade.
  - Sempre retornar `{ items: [{cr, descricao}] }` — sem `preferencia`.
- `serializePlanoContas`: gravar `{ items: [{cr, descricao}] }` puro, sem `preferencia_ia`.
- `buildPlanoContasMap` / `buildPlanoMap`: mapear apenas o CR (com aliases de formatação) → descrição.
- `planoContasForAI`: enviar linhas `"CR - descrição"` sempre pelo CR.
- `PlanoContasModal`: remover a coluna "Código completo" e o seletor "preferência da IA"; deixar só C.R. + descrição. Importação de planilha lê apenas colunas do CR/descrição.
- Migração de dados **não é necessária** (o parser aceita legado); só deixamos de escrever `codigo_completo`.

## 2. Edge function `process-folha-pagamento`

**Arquivo:** `supabase/functions/process-folha-pagamento/index.ts`.

- Ajustar o `SYSTEM_PROMPT` para deixar explícito: "Use SOMENTE o CR (código reduzido) do [PLANO DE CONTAS]. Não existem códigos completos."
- **Novos campos de saída:**
  - Em cada lançamento, adicionar `"justificativa": STRING` — texto curto explicando de onde o valor veio no PDF (ex.: "Soma de SALÁRIOS (R$ 12.340) + AJUDA DE CUSTO (R$ 400) da seção 'RESUMO DE PROVENTOS'") e, quando for uma linha consolidada de várias verbas, listar quais foram unificadas.
  - No topo do JSON, novo campo `"observacoes_ia": STRING` — texto livre para dúvidas, valores que não bateram, verbas suspeitas ou casos que exigiram interpretação. Vazio quando não houver observação.
- Persistir os novos campos:
  - `folha_lancamentos.justificativa TEXT NULL` (nova coluna, migration).
  - `folha_uploads.observacoes_ia TEXT NULL` (nova coluna, migration). Gravado por upload processado.
- Reconciliação matemática existente continua igual (identificação por regex no histórico); ao criar/ajustar linhas via código, preservar/gerar `justificativa` coerente (ex.: "Ajuste automático: soma calculada dos campos do PDF").
- `[SUGERIDO] / [REVISAR]` continuam funcionando; a IA agora também explica no campo `justificativa` por que sugeriu ou por que marcou para revisão.

## 3. Editor da folha

**Arquivos:** `src/pages/AdminFolhaEditor.tsx`, `src/components/admin/lancamentos/folha/FolhaRowEditor.tsx`, `src/components/admin/lancamentos/exportBuilders.ts` (se necessário para tipos).

- Carregar `justificativa` de cada linha e `observacoes_ia` da tabela `folha_uploads` (agregando de todos os uploads da competência — juntar por `\n\n`).
- Manter a planilha principal como está (9 colunas de exportação). A **coluna "Justificativa" é apresentada só na UI**, não vai para o XLSX/Calima:
  - Renderizar um painel/side panel: ao selecionar uma linha, mostrar a justificativa da IA em bloco de texto (`FolhaRowEditor` ganha uma seção "Justificativa da IA" acima dos campos editáveis).
  - Também exibir a justificativa em coluna extra do editor visual? Não — manter fora da planilha para não bagunçar a exportação, ficar só no side panel.
- Ao **salvar**, preservar `justificativa` original (não sobrescrever). Se o usuário adicionar/duplicar linha manualmente, `justificativa = null` (ou "Adicionado manualmente").
- Adicionar **card "Observações da IA"** na sidebar (acima do card de resumo), com o texto vindo de `folha_uploads.observacoes_ia`. Se vazio, esconder o card. Apenas leitura.
- Exports (Baixar XLSX / Calima) **não incluem** justificativa nem observações — mantém formato Calima intacto.

## 4. Migrations

```sql
ALTER TABLE public.folha_lancamentos ADD COLUMN IF NOT EXISTS justificativa TEXT;
ALTER TABLE public.folha_uploads     ADD COLUMN IF NOT EXISTS observacoes_ia TEXT;
```

Sem alteração de RLS/grants (herdam das tabelas).

## 5. Escopo do que **não** muda

- Compras, fiscal e extrato bancário: não recebem justificativa nem observações.
- Estrutura da exportação Calima e do XLSX baixado do editor de folha permanece idêntica.
- Reconciliação matemática (`salario_base + familia + ferias + 1/3 + ajuda_custo`) e regras de débito/crédito por natureza (do plano anterior aprovado) continuam vigentes.
- Prefixos `[SUGERIDO]` / `[REVISAR]` no histórico permanecem.

---

**Resultado esperado:** plano de contas simplificado a um único código (CR) em todo o sistema, e no fluxo de folha o usuário passa a ver, por linha, uma justificativa da IA explicando de onde veio o valor / o que foi somado, além de uma caixa de observações gerais da IA por competência.
