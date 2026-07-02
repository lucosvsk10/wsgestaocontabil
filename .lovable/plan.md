## Objetivo
1. Garantir que os valores mostrados/salvos são **exatamente** os do PDF — sem somas inventadas nem linhas sintéticas.
2. No editor da Folha, separar o "Total" em **Rendimentos (verde)** e **Descontos (vermelho)**.
3. Substituir as bordas douradas por um estilo neutro e agradável.

---

## 1. Corrigir a origem dos valores (edge function `process-folha-pagamento`)

O erro está na **reconciliação matemática** que hoje sobrescreve o que a IA leu:

- Trecho `salarioCalculado = salario_base + salario_familia + ferias + 1/3 + ajuda_custo` está **somando campos brutos** e substituindo o valor da linha de salários da IA — isso é a principal fonte de valores diferentes do PDF.
- O bloco de `eConsignado` cria uma linha nova se a IA não gerou, potencialmente duplicando o desconto.
- O `campos_pdf` estimulava a IA a devolver totais que depois eram re-somados.

**Ações:**
- Remover completamente o bloco de "RECONCILIAÇÃO MATEMÁTICA" (linhas ~255–326): nada de `salarioCalculado`, nada de `unshift`/`push` de linhas `[REVISAR]` a partir de `campos.*`.
- Retirar do `SYSTEM_PROMPT` a seção `campos_pdf` e a "VERIFICAÇÃO OBRIGATÓRIA (DOUBLE-CHECK)" que induziam a IA a recompor valores.
- Reforçar no prompt: *"Copie os valores exatamente como aparecem no PDF. Se agrupar linhas com mesma combinação débito+crédito, o valor final DEVE ser a soma aritmética exata das verbas listadas na justificativa — nunca arredonde, estime ou complete."*
- Manter a lógica de `[SUGERIDO]` / `[REVISAR]` e `justificativa` / `observacoes_ia` inalterada.
- `extractAiPayload` passa a retornar só `{ lancamentos, observacoes_ia }`.

Resultado: a planilha mostra o que a IA leu, sem "correções" via código que causam divergência.

## 2. Total dividido em Rendimentos × Descontos (`AdminFolhaEditor.tsx`)

Classificação por linha via histórico (evita depender do plano de contas do lado do cliente):

- **Desconto** quando o histórico bater com: `INSS S/`, `IRRF`, `CONSIGN`, `PENSAO`, `SINDICAL`, `CONVENIO`, `EMPRESTIMO`, `VALE`, ou começar com "DESC".
- **Rendimento** = todas as demais linhas com valor > 0 (salários, pró-labore, férias, rescisão, FGTS-empresa, etc. — do ponto de vista da folha são proventos/despesas da empresa).

Alterações:
- Substituir o `useMemo` `total` por `{ rendimentos, descontos, liquido }`.
- No card lateral, trocar a linha "Total" por dois campos:
  - `Rendimentos` — valor formatado em **verde** (`text-emerald-600 dark:text-emerald-400`).
  - `Descontos` — valor formatado em **vermelho** (`text-red-600 dark:text-red-400`).
  - Uma terceira linha discreta `Líquido` (rendimentos − descontos) em cor neutra, opcional.

## 3. Remover bordas douradas

Fonte principal: `src/styles/dark-mode.css` — cartões/inputs/popover usam `border-gold/30` e `border-gold/40`.

- Substituir todas as ocorrências de `border-gold/XX` (e `border-gold border-opacity-XX`) por `border-border` (token neutro do design system já existente).
- Ajustar `.dark .button` para `border-border` e hover `bg-accent/40` (sem tom dourado).
- Preservar o dourado apenas como cor de destaque de textos/ícones onde já é usada; **não** como borda de containers.
- Verificar `AdminFolhaEditor` e `FolhaRowEditor`: já usam `border-border`, ficam consistentes automaticamente após a limpeza do dark-mode.css.

---

## Arquivos afetados
- `supabase/functions/process-folha-pagamento/index.ts` — remover reconciliação + ajustar prompt + simplificar `extractAiPayload`.
- `src/pages/AdminFolhaEditor.tsx` — dividir Total em Rendimentos/Descontos com cor.
- `src/styles/dark-mode.css` — trocar `border-gold/*` por `border-border`.

## Fora de escopo
- Nenhuma mudança no banco (colunas `justificativa` e `observacoes_ia` continuam iguais).
- Nenhuma mudança em compras/fiscal/bancário.
- Formatos de exportação (XLSX / Calima) permanecem idênticos.
