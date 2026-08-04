# Plano de Contas com "Conta" (código completo) e "Analítica"

## Objetivo
Ampliar o plano de contas com duas novas colunas — **Conta** (código completo, estruturado por grupo) e **Analítica** (Sim/Não) — e fazer com que toda IA de lançamento leia Conta + C.R. + Descrição, usando o C.R. para definir débito/crédito e a Conta apenas para entender grupo/subgrupo.

## 1. Estrutura de dados
Cada item do plano passa a ter 4 campos:

| Campo | Uso |
|---|---|
| `conta` | Código completo (ex.: 4.1.01.0003) — define o grupo |
| `cr` | Código reduzido — único código usado em débito/crédito |
| `descricao` | Nome da conta |
| `analitica` | Sim/Não (obrigatório em todas as linhas) |

Gravado no mesmo campo `conteudo` da tabela `planos_contas` (JSON `{ items: [...] }`) — sem migração de banco. Planos antigos continuam abrindo normalmente: itens sem `conta` ficam vazios e sem `analitica` assumem "Sim" até serem editados.

## 2. Importação XLSX
- Detecção automática de 4 colunas: Conta ("conta", "conta contábil", "código completo", "classificação"), C.R., Descrição e Analítica ("analitica", "analítica", "tipo", "a/s").
- A tela de confirmação de importação passa a ter 4 seletores de coluna e a pré-visualização mostra as 4 colunas.
- Leitura da coluna Analítica: aceita Sim/S/Não/N/Analítica/Sintética/A/S/true/false. Vazio → "Sim".
- Se a planilha não tiver a coluna Analítica, o seletor permite marcar "(não existe — usar Sim para todas)".

## 3. Editor manual do plano
- Tabela do modal ganha as colunas **Conta** (input texto) e **Analítica** (Sim/Não).
- Busca passa a considerar também o código completo.
- Validação ao salvar continua exigindo apenas o C.R.

## 4. Leitura pela IA (todas as rotinas)
Um único bloco compartilhado (`supabase/functions/_shared/planoContas.ts`) passa a montar o plano para a IA como:

```text
CONTA | CR | DESCRIÇÃO | ANALÍTICA
4.1.01.0003 | 114 | SALARIOS E ORDENADOS | Sim
```

e um bloco de regras fixo, injetado no prompt de toda função que usa plano de contas:

- Débito e crédito são **sempre** o C.R.; nunca usar o código completo como conta do lançamento.
- O código completo serve só para identificar grupo/subgrupo pelo primeiro dígito:
  `1 = ativo, 2 = passivo, 3 = receita, 4 = despesa, 6 = resultados`.
- Lançar apenas em contas **analíticas**; contas sintéticas existem só como contexto de agrupamento.
- Coerência de natureza: despesa (4) a débito, receita (3) a crédito, etc.

Funções atualizadas para receber o novo formato e o bloco de regras:
- `contabilizar-folha` (folha de pagamento)
- `align-document` (lançamentos/despesas)
- `process-document-queue`
- `process-compras-cfop` (compras)
- `close-month` (só descrições — passa a resolver descrição também pelo código completo)

Como as regras ficam em um helper compartilhado, qualquer função de IA futura (faturamento etc.) herda o mesmo comportamento importando o mesmo bloco.

## 5. Exibição
Onde já mostramos a descrição a partir do C.R. (editores de folha/compras, exportações, autocomplete de contas), o lookup passa a indexar também o código completo, então nada quebra e a descrição resolve pelos dois códigos.

## Detalhes técnicos
- `src/lib/planoContas.ts` e `supabase/functions/_shared/planoContas.ts`: `PlanoContasItem` ganha `conta?: string` e `analitica: boolean`; `parse`/`serialize` com defaults retrocompatíveis; `buildPlanoContasMap` indexa aliases de `cr` **e** de `conta`; `planoContasForAI` retorna `{ text, json }` no novo formato + `PLANO_CONTAS_RULES`.
- `src/components/admin/lancamentos/PlanoContasModal.tsx`: `PendingImport` ganha `contaIdx` e `analiticaIdx` (-1 = ausente), novos seletores, preview e colunas do editor.
- Sem alteração de schema, RLS ou layout geral.

## Fora de escopo
Nenhuma mudança na lógica de agrupamento da folha, nos formatos de exportação (Calima etc.) ou no banco de dados.
