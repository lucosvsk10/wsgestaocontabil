

## Plano: Botão "Exportar Lista" com modal de opções

### O que será feito

Adicionar um botão "Exportar Lista" na toolbar dos lançamentos que abre um modal com opção de exportar por Data ou por Conta, gerando um arquivo XLSX formatado exatamente como exibido no site.

### Detalhes Técnicos

#### Arquivo 1: `src/components/admin/lancamentos/ExportLancamentosModal.tsx` (CRIAR)

Modal com:
- Seleção do modo: "Por Data" ou "Por Conta"
- Botão "Exportar XLSX"
- Lógica de geração usando a biblioteca `xlsx` (já instalada)

**Modo "Por Data":**
- Uma única aba com colunas: Data, Histórico, Débito, Desc. Débito, Crédito, Desc. Crédito, Valor
- Linha final com total

**Modo "Por Conta":**
- Cada conta gera um bloco separado na planilha com:
  - Header da conta (código + descrição)
  - Linhas dos lançamentos
  - Subtotal do grupo
  - Linha em branco entre grupos
- Linha final com total geral
- Estilização visual: headers de grupo em destaque, separação clara entre contas

Props: `isOpen`, `onClose`, `lancamentos`, `planoContas`, `clientName`, `competencia`

#### Arquivo 2: `src/components/admin/lancamentos/ClientLancamentosDetail.tsx` (MODIFICAR)

- Importar `ExportLancamentosModal`
- Adicionar state `isExportModalOpen`
- Adicionar botão "Exportar Lista" na toolbar (ao lado dos outros botões), visível quando há lançamentos
- Renderizar o modal passando os dados necessários

