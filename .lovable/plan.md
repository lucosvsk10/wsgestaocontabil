## Ajustes na área de Lançamentos (Admin)

### 1. Lista de Clientes acompanha altura da tela (imagem 1)
Em `src/components/admin/lancamentos/ClientStatusList.tsx`:
- Trocar `max-h-[calc(100vh-320px)]` por uma altura que acompanha o viewport real, usando `h-[calc(100vh-180px)]` no card raiz com `flex flex-col`, deixando o header fixo e a lista (`flex-1 overflow-y-auto`) preencher o restante.
- Resultado: a barra de rolagem aparece dentro do card e acompanha a tela; nada de scroll horizontal manual.

### 2. Modais em exibição completa e responsiva (imagem 2)
Em cada modal de Lançamentos, ampliar largura e remover overflow horizontal:
- `ImportXlsxModal.tsx`: `DialogContent` → `w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto` e converter a prévia da tabela em wrapper `overflow-x-auto` interno (em vez de o modal inteiro rolar lateralmente).
- `ExportLancamentosModal.tsx`: `sm:max-w-md` → `w-[95vw] max-w-lg`.
- `AddLancamentoModal.tsx`: `sm:max-w-md` → `w-[95vw] max-w-xl`.
- `PlanoContasModal.tsx`: `max-w-3xl` → `w-[95vw] max-w-4xl`.
- Garantir `max-h-[90vh]` + `overflow-y-auto` em todos para evitar corte vertical e rolagem horizontal manual.

### 3. Barra de busca em "Lançamentos Alinhados"
Em `ClientLancamentosDetail.tsx`:
- Adicionar estado `lancamentosSearch`.
- Inserir um `Input` com ícone `Search` logo acima da `LancamentosTable` (dentro do bloco "Lançamentos").
- Filtrar `lancamentos` por: histórico, débito, crédito, descrição da conta (via `planoContasMap`), centros de custo e valor formatado, antes de passar para `LancamentosTable`.
- Mostrar contagem filtrada/total no Badge.

### 4. Reformulação do header do cliente (imagem 3)
Mesma `ClientLancamentosDetail.tsx`, seções de header + barra de ações.

Layout novo, mais limpo e sem botões sobrepostos:

```text
┌──────────────────────────────────────────────────────────────┐
│ [Avatar] NOME DO CLIENTE                  [ Plano de Contas ]│
│         email                                                │
│                                                              │
│ Competência: [Mês ▾] [Ano ▾]                                 │
├──────────────────────────────────────────────────────────────┤
│ ✓ 14 lançamentos alinhados            [ 🔒 Fechar Janeiro ] │
├──────────────────────────────────────────────────────────────┤
│ ⬆  Upload para FLOR DO TRIGO — Janeiro/2026                  │
├──────────────────────────────────────────────────────────────┤
│ Lançamentos Alinhados (14)                                   │
│ [🔍 Buscar lançamento...........]                            │
│ [Ordenar: Por Data ▾]  [+ Novo]  [↑ Importar]  [↓ Exportar] │
│                                            [☑ Selecionar]    │
└──────────────────────────────────────────────────────────────┘
```

Mudanças concretas:
- Nome do cliente: usar `text-foreground` (cor padrão do tema), não amarelo. Remover qualquer destaque que esteja deixando o texto sem contraste; manter apenas o avatar com fundo `bg-primary/10`.
- Renomear botões para títulos curtos e claros:
  - "Adicionar" → "Novo lançamento"
  - "Importar XLSX" → "Importar planilha"
  - "Exportar Lista" → "Exportar"
  - "Selecionar" mantém.
- Agrupar a toolbar dos lançamentos em duas linhas em telas pequenas (`flex flex-wrap gap-2`) com separação visual: à esquerda título + busca + filtro de ordenação; à direita ações (Novo / Importar / Exportar / Selecionar) usando `ml-auto`.
- Padronizar todos os botões da toolbar com `variant="outline"`, `size="sm"`, `h-9`, `rounded-lg`, ícone à esquerda — eliminando o efeito "sobreposto".
- Mover "Plano de Contas" para o canto direito do header do cliente (alinhado com o nome) e nunca abaixo dos seletores de competência.
- Bloco "X lançamentos alinhados / Fechar mês" passa a ser um card próprio com `bg-muted/30`, com a mensagem à esquerda e o botão `Fechar` à direita, sem misturar com outros controles.

### Detalhes técnicos
- Sem mudanças de schema/migrations.
- Sem mudanças em edge functions.
- Arquivos editados:
  - `src/components/admin/lancamentos/ClientStatusList.tsx`
  - `src/components/admin/lancamentos/ClientLancamentosDetail.tsx`
  - `src/components/admin/lancamentos/ImportXlsxModal.tsx`
  - `src/components/admin/lancamentos/ExportLancamentosModal.tsx`
  - `src/components/admin/lancamentos/AddLancamentoModal.tsx`
  - `src/components/admin/lancamentos/PlanoContasModal.tsx`
- A busca de lançamentos é puramente client-side (filtra o array já carregado), sem custo extra de rede.
