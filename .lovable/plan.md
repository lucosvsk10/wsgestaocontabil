
## Plano: Tabela de Lancamentos Avancada com Agrupamento e Acoes Manuais

### 1. Adicionar colunas de descricao (Debito/Credito)

A tabela `LancamentosTable` passara a receber o plano de contas do cliente e exibir duas colunas extras:
- **Desc. Debito**: descricao da conta de debito (lookup pelo `Codigo reduzido` no plano de contas)
- **Desc. Credito**: descricao da conta de credito

O `ClientLancamentosDetail` ja busca o plano de contas (verifica se existe). Sera adicionada a busca do conteudo completo para passar ao componente da tabela.

### 2. Modo de exibicao: "por Data" ou "por Conta"

Adicionar um seletor "Exibir por" acima da tabela com duas opcoes:
- **Por Data** (padrao): ordena do mais antigo ao mais recente
- **Por Conta**: agrupa lancamentos pela conta de debito principal, com separadores visuais

No modo "Por Conta", a tabela exibira:

```text
+-----------------------------------------------------------+
| Conta: 823  |  Funcionarios                               |
+-----------------------------------------------------------+
| Data | Historico | Debito | Credito | Desc.Deb | ... | R$ |
| ...  | ...       | 823    | 376     | ...      | ... | .. |
+-----------------------------------------------------------+
| Subtotal: 3 lancamentos                        | R$ X.XXX |
+-----------------------------------------------------------+

+-----------------------------------------------------------+
| Conta: 777  |  Fornecedores Nacionais                     |
+-----------------------------------------------------------+
| Data | Historico | Debito | Credito | Desc.Deb | ... | R$ |
+-----------------------------------------------------------+
```

Cada grupo tera um header colorido com o codigo e nome da conta, e um subtotal ao final.

### 3. Acoes manuais (excluir e adicionar lancamentos)

Adicionar uma barra de ferramentas acima da tabela com botoes:
- **Adicionar lancamento** (icone +): abre modal para inserir manualmente (data, historico, debito, credito, valor)
- **Modo selecao** (icone checkbox): ativa caixas de selecao em cada linha + icone de lixeira
  - Ao ativar, aparece checkbox em cada linha e botao "Excluir selecionados" no topo
  - Ao desativar, checkboxes e lixeira desaparecem

Por padrao, os icones de lixeira e caixas de selecao ficam **ocultos** ate o usuario clicar em "Modo selecao".

### 4. Exportacao com separacoes por conta

Atualizar a Edge Function `close-month/index.ts` para que o Excel e CSV exportados incluam:
- Linhas separadoras com o nome da conta antes de cada grupo
- Subtotais por conta
- Total geral ao final

### Detalhes Tecnicos

**Arquivos a modificar:**

1. **`src/components/admin/lancamentos/LancamentosTable.tsx`** - Refatorar completamente:
   - Novas props: `planoContas`, `viewMode`, `onDelete`, `onAdd`
   - Logica de agrupamento por conta (usando campo `debito` como conta principal)
   - Modo selecao com checkboxes condicionais
   - Headers de grupo com estilo visual destacado (bg-primary/10, borda lateral dourada)
   - Subtotais por grupo

2. **`src/components/admin/lancamentos/ClientLancamentosDetail.tsx`**:
   - Buscar conteudo do plano de contas (`planos_contas.conteudo`) para o cliente
   - Parsear JSON e criar mapa `codigoReduzido -> descricao`
   - Adicionar estado `viewMode` ('data' | 'conta')
   - Adicionar estado `isSelectionMode`
   - Seletor "Exibir por" com dropdown
   - Barra de ferramentas com botoes Adicionar / Modo Selecao
   - Handler para excluir lancamentos selecionados
   - Handler para adicionar lancamento manual (inserir em `lancamentos_alinhados`)

3. **Novo: `src/components/admin/lancamentos/AddLancamentoModal.tsx`**:
   - Modal com formulario: Data, Historico, Debito, Credito, Valor
   - Select para debito/credito usando plano de contas
   - Insere diretamente em `lancamentos_alinhados`

4. **`supabase/functions/close-month/index.ts`**:
   - Buscar plano de contas do usuario
   - Modificar `generateCSV` e `generateExcel` para agrupar por conta e incluir separadores
   - Adicionar subtotais por grupo e total geral no Excel/CSV

**Estrutura do plano de contas (JSON na coluna `conteudo`):**
```json
[{ "data": [
  { "Codigo reduzido": 823, "Descrição": "FUNCIONARIOS", "Conta": 42301000 },
  ...
]}]
```

O mapeamento sera: `String(codigoReduzido)` para lookup nos campos `debito`/`credito` dos lancamentos.
