## Objetivo

Deixar o processamento da folha 100% guiado pelo plano de contas de cada empresa (sem código fixo), robusto para verbas novas, e turbinar o editor manual existente.

---

## 1. Edge function `process-folha-pagamento` — sem contas fixas

**Arquivo:** `supabase/functions/process-folha-pagamento/index.ts`

- Reescrever o `SYSTEM_PROMPT`:
  - Remover todas as menções a códigos fixos ("conta 92", "conta 88", "conta 823", "CR 823", "912", "100").
  - Substituir por instruções por **natureza da conta**: "conta de despesa de salários de funcionários", "conta de despesa de pró-labore", "conta de salários a pagar (passivo)", "obrigação de INSS a recolher", "FGTS a recolher", "empréstimo consignado a pagar", etc.
  - Reforçar: **use exclusivamente o CR presente no [PLANO DE CONTAS] enviado no contexto**. Nunca invente código.
  - Adicionar regra: para verbas não previstas nas categorias 1-7, procure no plano de contas a conta cuja descrição seja **semanticamente mais próxima** do evento; se usar essa via, prefixe o histórico com `[SUGERIDO]` e mantenha a lógica de débito (despesa/passivo) x crédito (passivo/obrigação).
  - Se não achar nenhuma conta plausível no plano, prefixar histórico com `[REVISAR]` e deixar `conta_debito` / `conta_credito` como `null`.
- Remover a reconciliação hardcoded que força `"92"/"823"` e `"823"/"912"`:
  - A linha consolidada de salários passa a ser identificada pelo **histórico** (`SALARIOS E REMUNERAÇÕES A PAGAR`), não pelos códigos. O valor calculado (`salario_base + familia + ferias + 1/3 + ajuda_custo`) sobrescreve apenas o campo `valor`; débito/crédito permanecem os que a IA escolheu do plano.
  - Mesma coisa para consignado: identificar por `/CONSIGN/` no histórico; não impor `823`/`912`.
  - Se a IA não gerou a linha e o valor > 0, criar a linha **sem débito/crédito** e prefixar histórico com `[REVISAR]` para o usuário completar no editor.
- Manter o double-check matemático (soma remunerações ≈ rendimentos − pró-labore).

## 2. Editor manual da folha — melhorias

**Arquivo:** `src/pages/AdminFolhaEditor.tsx` (+ pequeno componente novo)

- Adicionar barra de ações acima da planilha:
  - **➕ Adicionar linha** (insere linha em branco no final, data = último dia da competência).
  - **🗑️ Remover linha selecionada** (usa `selectedRow`).
  - **📋 Duplicar linha selecionada**.
- Criar `AccountAutocomplete` (novo, pequeno): input com dropdown que filtra pelo CR **ou** pela descrição do plano de contas. Quando o usuário edita as colunas "Conta Débito" ou "Conta Crédito", oferecer sugestões do `planoMap`. Ao escolher, preenche o CR e atualiza a coluna "Desc. Débito/Crédito" automaticamente.
- Sugestão de histórico: dropdown com os históricos padronizados do prompt (SALARIOS E REMUNERAÇÕES A PAGAR, PRO-LABORE A PAGAR MÊS MM/AAAA, INSS S/SALÁRIOS…, FGTS A PAGAR…, etc.) já preenchidos com a competência atual.
- Destaque visual para linhas com histórico começando em `[SUGERIDO]` (badge amarelo) e `[REVISAR]` (badge vermelho) para o usuário revisar antes de salvar/exportar.
- Manter Salvar / Baixar XLSX / Para Calima ERP como estão hoje.

## 3. Detalhes técnicos

- Nenhum código de conta é lido/escrito por lógica hardcoded fora do plano de contas.
- `folha_lancamentos` continua com a mesma estrutura (sem migration).
- `_shared/planoContas.ts` já expõe descrições por CR — reutilizar.
- Sem alteração em outras exportações (Calima segue o CR salvo).

## 4. O que **não** vai mudar

- Fluxo de upload/processamento na tela `FolhaPagamentoDetail` (fica só leitura + botão para o editor).
- Estrutura das tabelas.
- Contas fiscais/despesas/compras (fora do escopo).

---

**Resultado esperado:** cada empresa passa a ter os lançamentos de folha classificados apenas segundo o CR do seu próprio plano de contas, verbas novas caem como `[SUGERIDO]`/`[REVISAR]`, e o usuário pode adicionar/editar/remover linhas no editor com autocomplete de contas e sugestão de histórico.