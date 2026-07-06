## Objetivo

A IA deve simplesmente LER os valores do PDF exatamente como estão (rendimentos, descontos, FGTS a recolher, etc.), sem inventar, arredondar, acrescentar ou remover um centavo. Nada de auto-correção, nada de validação bloqueante no servidor. Se ela ler certo, os totais vão bater naturalmente. Se ela ler errado, o usuário revisa no editor — o site não deve barrar.

## O que muda

### 1. Edge function `process-folha-pagamento/index.ts`

- **Remover** completamente a função `validateFolhaTotals` e a chamada que hoje faz `throw` marcando `status = erro` quando as somas não batem.
- **Manter** a extração dos totais oficiais do PDF (`total_rendimentos_documento`, `total_descontos_documento`, `total_liquido_documento`) — mas **só como referência informativa** salva no banco. Não usar para bloquear nem para pedir retentativa.
- **Continuar enviando** esses totais para a IA no prompt como contexto: "o PDF diz que rendimentos são X, descontos são Y — copie fielmente".
- **Não fazer loop de retentativa**, não trocar de modelo dinamicamente. Uma chamada só. Se a IA errar, o resultado vai para o editor do jeito que veio.
- Salvar sempre `status = processado` quando a IA responder JSON válido. `status = erro` fica reservado só para falha real (IA offline, JSON inválido, PDF não baixou).
- Calcular `total_rendimentos_lancamentos`, `total_descontos_lancamentos`, `total_liquido_lancamentos` apenas para popular o painel de conferência do editor (visual), sem bloquear nada.

### 2. Reforço do system prompt

Deixar ainda mais direto o que a IA deve fazer:

- Ler o PDF verba por verba, linha por linha.
- Copiar os valores EXATAMENTE como aparecem, centavo por centavo.
- Nunca somar para "fechar" um total, nunca arredondar, nunca completar diferença, nunca omitir uma linha visível.
- Se agrupar linhas com a mesma dupla débito/crédito, a soma tem que ser aritmeticamente exata das verbas listadas na justificativa.
- FGTS a recolher, INSS patronal e demais encargos: continuam sendo lidos e lançados como `tipo = "encargo"`, também com valor exato do PDF.
- Se algo estiver ilegível, marcar com `[REVISAR]` e explicar — nunca chutar.

### 3. Editor `src/pages/AdminFolhaEditor.tsx`

- O painel "Conferência com o documento" fica apenas como referência visual (verde quando bate, alerta amarelo quando diverge). Nunca como bloqueio.
- Ajustar o texto para deixar claro: "Se houver divergência, revise as linhas — a IA não ajusta valores automaticamente."
- Nenhuma ação (exportar, salvar, editar) deve depender da conferência bater.

### 4. `FolhaPagamentoDetail.tsx`

- Remover o toast "X arquivo(s) ficaram com divergência" — como divergência não é mais erro, o toast volta a mostrar só o total de lançamentos gerados.
- `ultimo_erro` continua exibido, mas só apareceria em falha real de processamento.

## Detalhes técnicos

Fluxo simplificado da edge function por upload:

```text
1. baixar PDF
2. chamar IA (extração de totais oficiais) → salvar totais no banco
3. chamar IA (lançamentos) com plano de contas + totais oficiais como contexto
4. salvar lançamentos como vieram da IA
5. calcular somas por tipo apenas para exibir no editor
6. status = processado (sempre que a IA responder JSON válido)
```

Nada de:
- validação matemática que bloqueia,
- loop de retentativa da IA,
- troca dinâmica de modelo,
- linhas sintéticas,
- ajuste de valores no código.

Nenhuma migration nova é necessária.
