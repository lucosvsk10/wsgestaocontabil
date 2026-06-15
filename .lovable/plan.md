## Objetivo

Adicionar um segundo card no hub de Lançamentos — **Folha de Pagamento** — que recebe PDFs por mês, envia para a IA do Gemini (via Lovable AI Gateway) com o prompt contábil já definido, e abre o resultado no mesmo editor de planilha das exportações. Também mover o acesso ao Plano de Contas para um ícone de prédio ao lado de cada empresa no seletor, tornando-o a fonte global do site.

---

## 1. Plano de Contas global (acessível pelo seletor de empresa)

- `ClientStatusList`: ao lado do nome de cada empresa, adicionar um botão ícone `Building2` (prédio) que abre o `PlanoContasModal` daquela empresa (sem selecionar a empresa nem fechar o popover).
- O modal `PlanoContasModal` já existe e lê/grava em `planos_contas` — reutilizar sem alterações de schema.
- Criar helper `src/lib/planoContas.ts` com `fetchPlanoContas(clientId)` para o resto do site consumir como fonte única (já é, mas ficará centralizado para o módulo de folha usar também).

## 2. Card "Folha de Pagamento" no hub

- `LancamentoModulesGrid`: novo módulo `folha` com ícone `Wallet` (Lucide), ativo, `onClick: onOpenFolha`.
- `AdminLancamentos.tsx`: novo `View = "hub" | "despesas" | "folha"` e handler `handleOpenFolha`.

## 3. Nova tela: Folha de Pagamento

Componente `FolhaPagamentoDetail` (espelho leve do `ClientLancamentosDetail`):

- **Seletor de mês** reutilizando `MonthSelector` (mesmo padrão de competência YYYY-MM).
- **Histórico de meses** (lista com status: pendente / processado / fechado).
- **Área de upload** de PDFs por competência → grava no bucket `folha_pagamento` (privado) e cria linha em `folha_uploads`.
- Botão **"Processar com IA"** → chama edge function `process-folha-pagamento` para a competência selecionada.
- Após processar, botão **"Abrir editor"** navega para `/admin/lancamentos/folha/:clientId/editar?competencia=YYYY-MM`, que carrega `SpreadsheetEditor` (mesmo das exportações) pré-populado com as linhas geradas pela IA. Salvar grava de volta em `folha_lancamentos`.
- Botão **"Fechar mês"** trava edições (segue padrão `month_closures`).

## 4. Edge function `process-folha-pagamento`

- Input: `{ clientId, competencia, uploadIds[] }`.
- Para cada PDF: baixa do bucket, envia ao Lovable AI Gateway (`google/gemini-3-flash-preview`) com o prompt do usuário no system prompt + plano de contas (`planos_contas` do cliente) injetado, e o PDF como `input_file` (base64 `application/pdf`).
- Resposta esperada: array JSON de lançamentos `{data, conta_debito, conta_credito, historico, valor}`.
- Persiste em `folha_lancamentos` (substituindo o lote anterior daquela competência).
- Trata erros 402/429 do gateway com mensagens claras no UI.

## 5. Mudanças de schema (migração única)

Novas tabelas em `public`:

- `folha_uploads`: `id`, `client_id`, `competencia` (text YYYY-MM), `storage_path`, `nome_arquivo`, `status` (pending/processed/error), `created_at`.
- `folha_lancamentos`: `id`, `client_id`, `competencia`, `data` (date), `conta_debito` (int), `conta_credito` (int), `historico` (text), `valor` (numeric), `ordem` (int), `created_at`, `updated_at`.
- Adicionar `tipo` (text default `"despesas"`) em `month_closures` para diferenciar fechamentos de despesas vs folha, OU criar `folha_month_closures` separada (preferência: campo `tipo` para simplificar).

GRANTs para `authenticated` e `service_role`; RLS: admins (via `is_any_admin`) leem/escrevem tudo; clientes leem apenas seus próprios.

Bucket `folha_pagamento` privado (criado via tool).

## 6. Editor de planilha

- Reutilizar `SpreadsheetEditor` e infraestrutura de `AdminLancamentosExport` (export builders, leave-guard, download XLSX).
- Construir `SheetData` a partir de `folha_lancamentos` com colunas: Data, Conta Débito, Desc. Débito, CC Débito, Conta Crédito, Desc. Crédito, CC Crédito, Histórico, Valor — mesmo padrão "Saldo por Conta" / despesas, aplicando regras já existentes (ex: CC 100 para contas com "(-)").
- Salvar de volta com upsert por `(client_id, competencia, ordem)`.

## Detalhes técnicos

- Segredo `LOVABLE_API_KEY` já existe — usar em edge function (`Lovable-API-Key` header, `https://ai.gateway.lovable.dev/v1/chat/completions`).
- PDF enviado como bloco `{type:"file", file:{filename, file_data:"data:application/pdf;base64,..."}}` no `messages[0].content`.
- Prompt do usuário vira o `system` da request; plano de contas é injetado como bloco de texto antes do PDF.
- Datas: parse manual de "YYYY-MM-DD" (regra de timezone do projeto).
- UI: rounded-xl, neutros, sem amarelo, `max-w-3xl` nas views do cliente — segue o memory core.

## Arquivos

Novos:
- `src/components/admin/lancamentos/folha/FolhaPagamentoDetail.tsx`
- `src/components/admin/lancamentos/folha/FolhaUploadArea.tsx`
- `src/components/admin/lancamentos/folha/FolhaMonthHistory.tsx`
- `src/pages/AdminFolhaEditor.tsx` (editor da planilha gerada)
- `src/lib/planoContas.ts`
- `supabase/functions/process-folha-pagamento/index.ts`

Editados:
- `src/components/admin/lancamentos/LancamentoModulesGrid.tsx` (+card)
- `src/pages/AdminLancamentos.tsx` (+view "folha")
- `src/components/admin/lancamentos/ClientStatusList.tsx` (+ícone prédio → PlanoContasModal)
- `src/AppRoutes.tsx` (+rota do editor de folha)

## Confirmações pendentes

1. **Bucket único `folha_pagamento`** (paths `clientId/competencia/arquivo.pdf`) ou por cliente como já é em `lancamentos`? — Plano assume único.
2. **Modelo Gemini**: usar `google/gemini-3-flash-preview` (padrão, rápido e barato) ou `google/gemini-2.5-pro` (mais preciso, mais caro)? — Plano assume flash.
