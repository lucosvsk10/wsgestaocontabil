## Editor de planilha antes da exportação

### Fluxo
1. No `ExportLancamentosModal`, o usuário escolhe o modo (Por Data / Por Conta / Saldo por Conta) e clica em "Continuar para editor" (substitui o botão "Exportar XLSX").
2. O app navega para uma nova rota `/admin/lancamentos/:clientId/exportar/:modo?competencia=YYYY-MM`, abrindo o editor em tela cheia.
3. Na nova página o usuário edita células, adiciona/remove linhas e aplica formatação básica. Ao clicar em "Baixar XLSX", o arquivo é gerado e baixado (sem persistência).

### Layout da página do editor (`AdminLancamentosExport.tsx`)
```text
┌──────────────────────────────────────────────────────────────────────────┐
│ [←] Editor de Exportação                       [⬇ Baixar XLSX] [Cancelar]│
├──────────────────────────────────────┬───────────────────────────────────┤
│                                      │  Empresa                          │
│  Toolbar: [B] [Cor▾] [+ linha]       │  ─ FLOR DO TRIGO                  │
│           [− linha] [Desfazer]       │  Compet\u00eancia                       │
│                                      │  ─ Janeiro / 2026                 │
│  ┌──────────────────────────────┐    │  Formato                          │
│  │ Grade edit\u00e1vel (rolagem x/y) │    │  ─ Por Data                       │
│  │ ...                          │    │  Resumo                           │
│  └──────────────────────────────┘    │  ─ 14 lan\u00e7amentos                  │
│                                      │  ─ Total: R$ 12.345,67            │
│                                      │  Nome do arquivo                  │
│                                      │  [ lancamentos_flor_…xlsx     ]   │
└──────────────────────────────────────┴───────────────────────────────────┘
```
- Coluna esquerda (`flex-1`): toolbar fina + grade editável ocupando `h-[calc(100vh-180px)]` com scroll interno.
- Coluna direita (`w-80 shrink-0`): card `bg-muted/30 rounded-xl` com dados da empresa, mês/ano, modo escolhido, contagem e total, e input para renomear o arquivo.
- Cores neutras do tema, ícones Lucide, sem amarelo nas bordas.

### Editor de células
- Componente novo `SpreadsheetEditor.tsx` puramente client-side, sem nova dependência:
  - Estrutura `{ headers: string[]; rows: Cell[][] }` onde `Cell = { value: string | number; bold?: boolean; color?: string; bg?: string; merge?: { rowSpan, colSpan }; isSubtotal?: boolean }`.
  - Renderiza uma `<table>` com `contentEditable` por célula, `onBlur` salvando no estado.
  - Toolbar: negrito, cor do texto (popover com 6 cores), cor de fundo, adicionar linha acima/abaixo, remover linha selecionada, desfazer (pilha de snapshots, máx. 50).
  - Seleção: clique em uma linha destaca; Shift+clique seleciona intervalo (apenas para remover/formatar).
  - Sem fórmulas, sem reordenar colunas (fora do escopo escolhido).

### Geração inicial dos dados
- Reaproveitar a lógica de `ExportLancamentosModal` extraindo em `src/components/admin/lancamentos/exportBuilders.ts`:
  - `buildByDate(lancamentos, planoContas)` → `{ headers, rows, merges }`
  - `buildByAccount(...)` → idem (com linhas de cabeçalho de grupo já marcadas `isSubtotal/merge`).
  - `buildBalanceByAccount(..., competencia)` → idem.
- O modal passa a chamar esses builders só para validar/contar; a página do editor também os chama no `useEffect` inicial.

### Download
- Botão "Baixar XLSX" converte o estado do editor em planilha com `xlsx`:
  - `XLSX.utils.aoa_to_sheet` a partir de `[headers, ...rows.map(r => r.map(c => c.value))]`.
  - Aplica `!merges` reconstruído a partir das células com `merge`.
  - Aplica estilos básicos via `cell.s` (negrito, cor) — usar `xlsx-js-style` se necessário; alternativa: manter formatação só visual no editor e exportar valores puros (decidir na implementação se `xlsx` puro não cobre estilos).
- Nome do arquivo vem do input lateral, default `lancamentos_<cliente>_<competencia>_<modo>.xlsx`.

### Roteamento e navegação
- Adicionar rota em `src/AppRoutes.tsx`: `/admin/lancamentos/:clientId/exportar/:modo` → `AdminLancamentosExport` (protegida pelo mesmo guard de admin).
- `ExportLancamentosModal` recebe `clientId` e `competencia`, e em vez de gerar o XLSX, chama `navigate(...)` com o modo escolhido e fecha o modal.
- Página do editor carrega os lançamentos pelo hook existente `useLancamentosData(clientId, competencia)` (ou refaz a query equivalente) e o plano de contas; mostra skeleton enquanto carrega.

### Arquivos
- Novos:
  - `src/pages/AdminLancamentosExport.tsx`
  - `src/components/admin/lancamentos/SpreadsheetEditor.tsx`
  - `src/components/admin/lancamentos/exportBuilders.ts`
- Editados:
  - `src/AppRoutes.tsx` (nova rota)
  - `src/components/admin/lancamentos/ExportLancamentosModal.tsx` (passa a navegar em vez de baixar)
  - `src/components/admin/lancamentos/ClientLancamentosDetail.tsx` (passa `competencia` corretamente ao modal, se ainda não passa)

### Fora de escopo
- Sem mudanças de schema, edge functions ou Storage.
- Sem fórmulas, sem reordenar colunas, sem múltiplas abas.
- Sem persistência do arquivo editado.
