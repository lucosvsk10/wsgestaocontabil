# Refatoração do sistema de folha de pagamento

Vou reconstruir o fluxo de folha em duas etapas de IA independentes, com upload que dispara o processamento automaticamente.

## Fluxo novo

```text
PDF enviado
   │
   ▼
[Etapa 1 - IA "Digitalizadora"]  → lê APENAS o PDF
   │  Extrai linha a linha: Cód, Descrição, Referência,
   │  Rendimentos, Descontos, Recol FGTS (sem somar, sem
   │  interpretar, sem inventar).
   ▼
Tabela transcrita (editável)
   │  Valida: soma Rendimentos = total oficial do PDF
   │          soma Descontos   = total oficial do PDF
   │  Se não bater → status "erro_transcricao", pede reprocesso.
   ▼
[Etapa 2 - IA "Contabilizadora"] → lê APENAS a tabela
   │  Sem PDF, sem valores originais além dos já transcritos.
   │  Aplica plano de contas + regras de agrupamento
   │  (as regras serão definidas por você depois; por ora
   │   uso um prompt-esqueleto pronto para receber suas
   │   instruções).
   ▼
Lançamentos contábeis finais
```

## 1. Banco de dados

Nova tabela `folha_transcricoes` para guardar o resultado da etapa 1:
- `upload_id`, `client_id`, `competencia`
- `linhas` (jsonb): `[{ codigo, descricao, referencia, rendimento, desconto, recol_fgts }]`
- `total_rendimentos_pdf`, `total_descontos_pdf`, `total_recol_fgts_pdf`
- `status` (`pendente` | `transcrito` | `erro_transcricao` | `contabilizado`)
- `erro`, timestamps

Ampliar `folha_uploads.status` para incluir `transcrevendo`, `transcrito`, `contabilizando`.

Limpar dados antigos: `DELETE` em `folha_lancamentos`, `folha_uploads` e objetos do bucket `lancamentos` sob `folha/` (conforme sua escolha "limpar tudo").

## 2. Edge functions

Reescrever `process-folha-pagamento` e dividir em duas funções:

**`transcrever-folha`** (etapa 1)
- Recebe `uploadId`.
- Baixa o PDF, envia para Gemini 2.5 Pro com prompt rígido: "transcreva exatamente as linhas da tabela; nunca some, nunca invente, nunca corrija; devolva também os três totais impressos no rodapé".
- Salva em `folha_transcricoes`.
- Valida `soma linhas == totais do rodapé` (tolerância 0). Se divergir → `status = erro_transcricao`, grava mensagem clara e **não** chama a etapa 2.
- Se bater → dispara automaticamente `contabilizar-folha`.

**`contabilizar-folha`** (etapa 2)
- Recebe `transcricaoId`.
- **Não** acessa Storage nem PDF. Passa para a IA apenas: tabela transcrita + plano de contas do cliente + (futuramente) suas regras de agrupamento.
- Gera `folha_lancamentos` a partir do resultado.
- Marca transcrição como `contabilizado` e upload como `processado`.

## 3. Frontend

`FolhaPagamentoDetail.tsx`:
- Upload dispara `transcrever-folha` imediatamente por arquivo enviado (sem botão "Processar DOC"). Remover esse botão.
- Realtime/polling em `folha_uploads` + `folha_transcricoes` para mostrar progresso (`Enviando → Transcrevendo → Conferindo totais → Gerando lançamentos → Concluído` ou `Erro`).
- Nova seção "Transcrição do documento": mostra a tabela editável (Cód, Descrição, Referência, Rendimentos, Descontos, Recol FGTS) com rodapé comparando soma × totais do PDF. Campo em vermelho quando divergente.
- Botão "Salvar e refazer lançamentos" na tabela editável: grava alterações e re-executa `contabilizar-folha` (a etapa 1 não roda de novo, respeitando a edição manual).
- Se `status = erro_transcricao`: mostrar mensagem e botão "Reprocessar PDF" (roda etapa 1 de novo).
- Remover textos antigos de "conferência informativa".

`AdminFolhaEditor.tsx`:
- Mostrar acima dos lançamentos a tabela transcrita (somente leitura aqui) para o admin conferir origem dos valores.
- Remover lógica de "aceitar divergência".

## 4. Prompts

**Etapa 1 (digitalização)** — regras duras:
- Ler a tabela verba por verba, exatamente como impressa.
- Nunca somar, arredondar, completar, inferir, mover valor de coluna, unificar linhas.
- Devolver JSON estrito `{ linhas: [...], totais_pdf: { rendimentos, descontos, recol_fgts } }`.
- Se uma célula estiver ilegível: devolver `null` e listar em `observacoes`, sem chutar.

**Etapa 2 (contabilização)** — esqueleto pronto para receber suas regras futuras:
- Entrada: tabela já transcrita + plano de contas.
- Instrução base: "use somente estes valores, não recalcule, não crie linha nova".
- Deixo um bloco `REGRAS_DE_AGRUPAMENTO` vazio comentado, para você preencher quando quiser.

## Detalhes técnicos

- Modelo em ambas as etapas: `google/gemini-2.5-pro` via Lovable AI Gateway (multimodal para PDF na etapa 1; texto puro na etapa 2).
- Etapa 1 usa `Output.object` com schema pequeno (linhas + 3 totais), sem `min`/`max`.
- Validação de totais em código, tolerância `0.00` (bloqueia qualquer diferença, conforme você pediu).
- Realtime via `supabase.channel` em `folha_uploads` e `folha_transcricoes` dentro de `useEffect` com cleanup.
- Migração inclui `GRANT`s obrigatórios e RLS por `client_id`/admin.
- Após aprovação da migração e limpeza dos dados antigos, faço as alterações de código e deploy das duas edge functions.

## Fora do escopo desta rodada

- Regras específicas de agrupamento contábil e de leitura do plano de contas na etapa 2 — ficam como bloco a preencher quando você me passar as instruções.
