# Plano: Nova estrutura da página de Gestão de Lançamentos

## Objetivo
Transformar `/admin/lancamentos` em um hub: empresa selecionada fica fixa no topo central (persistente), e abaixo aparecem cards de módulos de lançamento. Por enquanto, apenas o card **Lançamentos de Despesas** abre o fluxo atual.

## Fluxo do usuário

1. Usuário entra em `/admin/lancamentos`.
2. No topo central, vê um seletor de empresa:
   - Se nenhuma estiver selecionada: mostra "Selecionar empresa" e abre a lista ao clicar.
   - Se já houver uma escolhida (persistida): mostra o nome da empresa; clicar reabre a lista para trocar.
3. Após selecionar, a empresa fica fixa (persistida em `localStorage`) até que o usuário troque.
4. Abaixo, aparece uma grade de cards de módulos. Por ora:
   - **Lançamentos de Despesas** (ativo) → abre a tela atual de detalhes (`ClientLancamentosDetail`) para a empresa selecionada.
   - Espaço reservado visualmente para módulos futuros (cards "Em breve" desabilitados, opcional).
5. Enquanto nenhuma empresa estiver selecionada, os cards ficam desabilitados com instrução para escolher uma empresa.

## Mudanças de UI

### Topo central — Seletor de empresa
- Componente novo `CompanySelectorTop` (botão grande centralizado).
- Ao clicar, abre um `Popover`/`Dialog` reutilizando a lista atual (`ClientStatusList`) com busca.
- Mostra nome da empresa selecionada + ícone chevron; estilo alinhado ao tema (cards `rounded-xl`, sem amarelo de borda).

### Grade de módulos
- Componente novo `LancamentoModulesGrid` com cards (`rounded-xl`, soft shadow, ícone Lucide).
- Cada card: ícone + título + descrição curta + estado (ativo/em breve).
- Card ativo: **Lançamentos de Despesas** (ícone `Receipt` ou `FileSpreadsheet`).

### Tela de detalhes
- Ao clicar no card de Despesas, navega para uma sub-rota dedicada (ex.: `/admin/lancamentos/despesas/:clientId`) que renderiza `ClientLancamentosDetail` com um botão "Voltar" para o hub.
- Alternativa mais simples: manter na mesma página alternando estado local (`view: 'hub' | 'despesas'`) sem mudar rota. Vou usar **estado local** para evitar refatorar rotas existentes.

## Persistência
- `localStorage` key: `admin.lancamentos.selectedClientId`.
- Carregada no mount; salva sempre que muda.

## Arquivos afetados

- `src/pages/AdminLancamentos.tsx` — reescrito: header + `CompanySelectorTop` + `LancamentoModulesGrid` + render condicional do detalhe.
- `src/components/admin/lancamentos/CompanySelectorTop.tsx` — **novo**.
- `src/components/admin/lancamentos/LancamentoModulesGrid.tsx` — **novo**.
- `src/components/admin/lancamentos/ClientStatusList.tsx` — sem mudança de lógica; será usada dentro de um Popover/Dialog (pode receber prop opcional `compact` se necessário).

## Não incluído
- Não altera `ClientLancamentosDetail`, exportações, edição rápida, ou qualquer regra de negócio.
- Não cria módulos futuros — apenas reserva visual (opcional).

## Pergunta pendente
Quer que os cards de "módulos futuros" apareçam como placeholders desabilitados ("Em breve"), ou exibo apenas o card de Despesas por enquanto?
