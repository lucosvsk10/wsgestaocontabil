# Plano de Contas com Código Completo + C.R.

Hoje o plano de contas tem só um campo (`codigo`) que representa o C.R. (código reduzido). Vamos passar a guardar **dois códigos por conta** e deixar o admin escolher, por cliente, **qual deles a IA vai ler** — só um vai pro prompt, evitando token desnecessário.

## O que muda na tela (PlanoContasModal)

Tabela passa a ter 3 colunas editáveis:

```text
| Código Completo | C.R. (reduzido) | Descrição |
```

Logo acima da tabela, um seletor exclusivo (toggle group estilo "pill", só uma opção ativa por vez):

```text
IA vai ler:  [ C.R. ]  [ Código Completo ]
```

- Default: **C.R.** (mantém comportamento atual).
- A escolha é por cliente e fica salva junto com o plano.
- Aviso curto ao lado: "A IA recebe apenas o campo selecionado para reduzir custo."

Importação XLSX: o passo de mapeamento de colunas ganha um terceiro select ("Código Completo"), opcional. Auto-detecção aceita cabeçalhos como `código completo`, `codigo contábil`, `conta completa`, `código analítico`. Se a planilha tiver só uma coluna de código, ela vai pro campo correspondente à preferência atual e a outra fica vazia.

Entrada manual: linha nova traz os 3 campos. Pelo menos um dos códigos é obrigatório por linha.

## Como fica salvo

A coluna `planos_contas.conteudo` continua sendo texto (JSON). Sem migration. Novo formato:

```json
{
  "preferencia_ia": "cr",            // "cr" | "completo"
  "items": [
    { "cr": "493", "codigo_completo": "1.1.01.001", "descricao": "..." }
  ]
}
```

Parser aceita os formatos antigos (array puro de `{codigo, descricao}`): trata `codigo` como `cr`, deixa `codigo_completo` vazio, `preferencia_ia = "cr"`.

## Como a IA passa a ler

`src/lib/planoContas.ts` → `fetchPlanoContas` retorna:

```ts
{ items, preferencia, map }   // map é keyed apenas pelo código preferido
```

As edge functions que montam o prompt (`align-document`, `process-folha-pagamento`, `process-document-queue`, `close-month`, mais o uso na confirmação de compras) vão enviar **só** o par `código preferido → descrição`. Telas que listam contas (`AdminLancamentosExport`, `AdminFolhaEditor`, `AdminComprasEditor`, `ClientLancamentosDetail`, `ClientStatusList`, `DocumentUploadArea`, `ExportLancamentosModal`) usam o mesmo `map` — exibem o código preferido. Sem mudança de UX nelas.

## Arquivos afetados

- `src/components/admin/lancamentos/PlanoContasModal.tsx` — 3 colunas, toggle de preferência, import com 3 selects, salvar novo JSON.
- `src/lib/planoContas.ts` — novo schema + parser retrocompatível + `preferencia` no retorno.
- `supabase/functions/align-document/index.ts`, `process-folha-pagamento/index.ts`, `process-document-queue/index.ts`, `close-month/index.ts`, `confirm-compras-lancamentos/index.ts` — ler novo JSON, mandar para IA somente o campo preferido.
- Consumidores frontend listados acima — ajuste mínimo só para usar o helper atualizado.

## Fora do escopo

- Não vamos alterar schema do Postgres (continua `text`).
- Não vamos converter automaticamente planos existentes — eles continuam funcionando como "só C.R." até o admin reimportar/editar.
