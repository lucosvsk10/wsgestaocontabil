## Problema

Na tela de Lançamentos → Folha, a transcrição do PDF funciona, mas a etapa 2 (contabilização) falha com "Resposta da IA sem JSON." (visto na imagem 2). O `contabilizar-folha` já pede `response_format: json_object` ao Gemini, mas o parser atual (`extractJson`) é ingênuo: pega o primeiro `{` e o último `}`. Quando o Gemini devolve o JSON dentro de bloco markdown, com texto/pensamento antes, com vírgulas finais, ou (mais provável aqui) com uma resposta vazia/muito curta por `finish_reason=length`, ele quebra e propaga "Resposta da IA sem JSON.".

Além disso, os dois botões de "Reprocessar" (o do card do upload e o do editor inline de lançamentos) disparam a ação imediatamente e sobrescrevem tudo.

## O que fazer

### 1. `supabase/functions/contabilizar-folha/index.ts` — parser robusto
Substituir `extractJson` por uma versão tolerante:
- Remove fences ```` ```json ```` / ```` ``` ```` e caracteres de controle.
- Detecta truncamento: se `finish_reason === "length"` **ou** contagem de `{` ≠ `}` / `[` ≠ `]`, lança erro claro ("Resposta da IA foi truncada — reprocesse").
- Localiza o primeiro `{` ou `[` como início, faz balance-scan de chaves respeitando strings/escapes pra achar o fim real (não o último `}` do arquivo, que pode estar dentro de uma string).
- Fallback: tenta parsear direto; se falhar, retira vírgulas finais (`,}` / `,]`) e tenta de novo.
- Se ainda falhar, joga erro com um trecho (primeiros 300 chars) da resposta pra aparecer no card do upload e facilitar debug.

Também aumentar o teto de tokens da chamada Gemini (`max_tokens: 8000`) para reduzir chance de corte em folhas grandes, e logar `finish_reason` + tamanho da resposta no console para diagnóstico futuro via edge function logs.

### 2. Confirmações antes de reprocessar
Trocar cada `onClick={handleReprocessar…}` por um `AlertDialog` (shadcn) com título "Reprocessar?" e descrição avisando que os dados atuais serão sobrescritos, botões "Cancelar" e "Reprocessar" (destructive). Aplicar em:

- `src/components/admin/lancamentos/folha/FolhaPagamentoDetail.tsx` — botão "Reprocessar" do card do upload (dispara transcrição + contabilização, apaga tudo).
- `src/components/admin/lancamentos/folha/LancamentosInlineEditor.tsx` — botão "Reprocessar contabilização" (apaga lançamentos gerados).
- `src/components/admin/lancamentos/folha/TranscricaoEditor.tsx` — botão "Reprocessar PDF" (apaga transcrição + lançamentos).

### 3. Validação
Após deploy, subir novamente o mesmo `Resumo da folha.pdf` e conferir nos logs de `contabilizar-folha` que a resposta é parseada. Se ainda vier truncada, o erro exibido agora dirá exatamente o motivo (truncamento vs. JSON inválido) em vez de "sem JSON".

## Fora de escopo
Nenhuma mudança em transcrição, plano de contas, prompt de contabilização, esquema do banco ou layout do editor.
