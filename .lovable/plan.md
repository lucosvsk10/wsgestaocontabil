## Objetivo
Exibir na tela principal (`FolhaPagamentoDetail`) as **duas planilhas** geradas pela IA para cada PDF, com navegação em carrossel/abas:

1. **Transcrição** (bruta do PDF) — a que já existe hoje via `TranscricaoEditor`.
2. **Lançamentos contábeis** (débito/crédito/histórico/valor/data gerados pela IA a partir do plano de contas) — nova, editável inline.

Cada aba tem o botão do editor completo (rota atual `/admin/lancamentos/folha/:clientId/editar`).

## Mudanças

### 1. Novo componente `LancamentosInlineEditor.tsx`
`src/components/admin/lancamentos/folha/LancamentosInlineEditor.tsx`
- Recebe `uploadId`, `clientId`, `competencia`.
- Busca `folha_lancamentos` filtrando por `source_upload_id=uploadId`, ordenado por `ordem`.
- Renderiza tabela editável (mesmo padrão visual do `TranscricaoEditor`) com colunas: Data, Débito, Crédito, Histórico, Valor, Justificativa.
- Ações por linha: editar inline (blur salva via `update`), remover.
- Rodapé: total de rendimentos / descontos / líquido (calculado no cliente, apenas exibição).
- Botão "Reprocessar contabilização" → chama `contabilizar-folha` com o `transcricaoId` correspondente.
- Se não houver lançamentos ainda e a transcrição estiver `contabilizando` → mostra spinner "Gerando lançamentos...".

### 2. Carrossel/abas dentro de cada upload expandido
Em `FolhaPagamentoDetail.tsx`, no bloco `{t && isOpen && (...)}`:
- Substituir a renderização direta do `TranscricaoEditor` por um container com **Tabs** (`@/components/ui/tabs`) contendo:
  - Aba "Transcrição (bruta)" → `<TranscricaoEditor …>`
  - Aba "Lançamentos contábeis" → `<LancamentosInlineEditor …>`
- Cada aba mantém à direita o botão **"Abrir editor completo"** que navega para `/admin/lancamentos/folha/:clientId/editar?competencia=…` (mesma rota já existente).

### 3. Sem alterações no backend
As Edge Functions `transcrever-folha` e `contabilizar-folha` continuam idênticas. Os dados já estão em `folha_transcricoes` (transcrição) e `folha_lancamentos` (alinhados).

### 4. Realtime
O canal atual já escuta `folha_uploads` e `folha_transcricoes`. Adicionar listener para `folha_lancamentos` (filtro por `client_id`) para que a segunda aba se atualize sozinha assim que a IA terminar.

## Não muda
- Rota do editor completo (`AdminFolhaEditor`) permanece.
- Regras da IA / prompts / tabelas do banco.
- Fluxo de upload automático.
