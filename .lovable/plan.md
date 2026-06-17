## Novo módulo: Compras (Registro de Entradas por CFOP)

Adiciona um terceiro card no hub de lançamentos do admin (ao lado de Despesas e Folha), com fluxo: upload PDF → IA extrai blocos por CFOP → usuário seleciona quais lançar → sistema gera os lançamentos contábeis e grava em `lancamentos_alinhados` para entrar no fechamento do mês.

### 1. Banco de dados
Nova tabela `compras_uploads` (espelhando `folha_uploads`):
- `user_id`, `competencia` (YYYY-MM), `file_url`, `file_name`, `status` (pending/processed/error), `dados_extraidos` (jsonb com as linhas por CFOP), `processed_at`.
- RLS: admins via `is_any_admin`, dono via `user_id`. GRANTs para authenticated/service_role.

Mapeamento CFOP → contas editável por cliente:
- Nova tabela `compras_cfop_mapping`:
  - `user_id`, `cfop` (text), `conta_debito` (text), `conta_credito` (text default '777'), `ativo_padrao` (boolean — define se vem pré-selecionado no upload).
  - RLS por `user_id` + admin.
  - Seed inicial via UI (não migration): admin pode adicionar/editar.

Bucket de storage: reutiliza `lancamentos` (já existe) sob prefixo `compras/<user_id>/<competencia>/`.

### 2. Edge function `process-compras-cfop`
- Recebe `upload_id`.
- Baixa PDF, extrai texto (pdf-parse via npm: ou usa Gemini com input file_data base64 — mesma abordagem do process-folha-pagamento).
- Chama Lovable AI Gateway (`google/gemini-3-flash-preview`) com o prompt do usuário (regras de leitura ETAPA 1) + lista de CFOPs mapeados do cliente para definir `selecionado` default.
- Espera JSON `{ "linhas": [{ cfop, descricao, vr_contabil, selecionado }] }`.
- Salva em `compras_uploads.dados_extraidos` e marca `status=processed`.

Edge function `confirm-compras-lancamentos`:
- Recebe `upload_id` + array de linhas selecionadas (com cfop, descricao, vr_contabil).
- Para cada linha, busca mapping CFOP → (débito, crédito) do cliente; se não existir, retorna erro listando os CFOPs faltantes.
- Gera registros em `lancamentos_alinhados` com:
  - `data_lancamento` = último dia da competência
  - `valor` = vr_contabil
  - `conta_debito`, `conta_credito` do mapping
  - `historico` = `"<DESCRIÇÃO EM CAIXA ALTA> - MÊS MM/AAAA"`
  - `centro_custo_debito`/`credito` = null (contas patrimoniais)
  - `origem` = 'compras_cfop'

### 3. Frontend

**Hub** (`src/components/admin/lancamentos/LancamentoModulesGrid.tsx`): adicionar card "Compras" → rota `compras`.

**`AdminLancamentos.tsx`**: aceitar view `"compras"` e renderizar `ComprasDetail`.

**Novos componentes** em `src/components/admin/lancamentos/compras/`:
- `ComprasDetail.tsx` — wrapper com seletor de mês, upload, lista de uploads do mês.
- `ComprasUploadArea.tsx` — drag/drop PDF, chama edge function.
- `ComprasUploadCard.tsx` — para cada upload mostra status; quando `processed`, mostra tabela com checkboxes:
  - Colunas: ☑ | CFOP | Descrição | Vr. Contábil (R$ formatado) | Conta Débito (auto, do mapping) | Conta Crédito
  - Linhas sem mapping aparecem em amarelo com aviso "CFOP não mapeado".
  - Botão "Confirmar e lançar" → chama `confirm-compras-lancamentos`.
- `CfopMappingDialog.tsx` — gerenciar o de-para CFOP→contas do cliente (CRUD simples + toggle "pré-selecionado por padrão").

**Estilo**: segue padrão dos outros módulos (rounded-xl, max-w-3xl, sem emojis, Lucide icons, valores em R$ brasileiro).

### 4. Regras de negócio confirmadas
- Pré-seleção definida pelo campo `ativo_padrao` do mapping do cliente (admin configura uma vez).
- Histórico: `"<DESCRIÇÃO CFOP EM CAIXA ALTA> - MÊS MM/AAAA"`.
- Data: último dia da competência.
- Valor usado: sempre **Vr. Contábil** (Vr. Total é ignorado pela IA).
- Centro de custo: vazio (compras vão para contas patrimoniais/estoque, não despesas).
- Nada de `dados_extraidos` aparece como texto bruto — apenas a tabela estruturada.

### Detalhes técnicos
- Reaproveitar `extractAiPayload`/`round2` do `process-folha-pagamento` (copiar para o novo edge function).
- Lovable AI com `response_format: { type: "json_object" }`.
- Realtime na lista de uploads para refletir `status` durante processamento.
- Após confirmar lançamentos, marcar `compras_uploads.status = 'launched'` para travar reprocessamento (admin pode "Reverter" deletando os `lancamentos_alinhados` daquele upload — opcional, posso adicionar se quiser).
