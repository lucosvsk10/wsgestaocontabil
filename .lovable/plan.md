
## Objetivo

Fechar a Etapa 2 (contabilização) para que ela gere automaticamente os lançamentos agrupando as verbas transcritas, seguindo as diretrizes contábeis originais — sem CR/conta fixa (cada empresa tem seu plano de contas próprio) — e incluindo o **Recol FGTS** (que aparece no rodapé "Resultados" do PDF) como um lançamento próprio.

## 1. Etapa 1 (transcrição) — pequeno ajuste

`transcrever-folha/index.ts`:
- Reforçar no prompt que a linha do **Recol FGTS** (bloco "Resultados", abaixo da tabela principal) deve ser transcrita como uma linha adicional na tabela, com `codigo = "RECOL_FGTS"`, `descricao = "Recol. FGTS"`, valor na coluna `recol_fgts` (e `rendimento`/`desconto` nulos).
- Continua exigindo que a soma da coluna `recol_fgts` das linhas seja igual a `total_recol_fgts_pdf` (bloqueia se divergir).
- Nada muda na UI de transcrição — a linha só aparece na tabela editável.

## 2. Etapa 2 (contabilização) — preencher as regras de agrupamento

`contabilizar-folha/index.ts` — substituir o bloco vazio `### REGRAS DE AGRUPAMENTO / MAPEAMENTO` do system prompt pelas diretrizes originais, adaptadas para funcionarem **100% pelo plano de contas do cliente** (usando o CR que existir nele; nenhum código fixo no código):

### Princípio da conciliação dinâmica
Para cada verba transcrita, escolher no plano de contas fornecido:
- Rendimentos / encargos da empresa → **débito** em conta de despesa/resultado da natureza correspondente.
- Descontos e obrigações → **crédito** em conta de passivo circulante da natureza correspondente.
- Contrapartida das remunerações a pagar → conta de passivo "salários/pró-labore a pagar" do próprio plano.

### Agrupamento por [Débito + Crédito] com históricos padronizados (CAIXA ALTA, competência MM/AAAA)
1. **Remunerações regulares** (Salário base, Horas extras, DSR, Médias, Gratificações, Salário família, Salário maternidade, Ajuda de custo, Férias, 1/3 sobre férias, Compl. férias) → despesa de salários × salários a pagar. Histórico: `SALARIOS E REMUNERAÇÕES A PAGAR MÊS MM/AAAA`.
2. **Pró-labore** (linhas de sócio) → despesa de pró-labore × pró-labore a pagar. Histórico: `PRO-LABORE A PAGAR MÊS MM/AAAA`.
3. **Verbas rescisórias** (Saldo de salário, Aviso prévio, 13º rescisão) → despesa correspondente × salários/benefícios rescisórios a pagar. Histórico: `RECISAO A PAGAR MÊS MM/AAAA`.
4. **Férias indenizadas/rescisão** → despesa de férias × férias a pagar. Histórico: `FERIAS A PAGAR MÊS DE MM/AAAA (RECISÃO)`.
5. **INSS retido** (separar por origem):
   - INSS sobre salários de empregados → `INSS S/SALÁRIOS A PAGAR MÊS MM/AAAA`
   - INSS sobre pró-labore (sócio) → `INSS S/PRO-LABORE (SOCIO) A PAGAR MÊS MM/AAAA`
   - INSS sobre 13º rescisão → `INSS S/13º SALARIO - RECISÃO A PAGAR MÊS DE MM/AAAA`
   - Débito: conta de salários/pró-labore a pagar (a que sofreu o desconto). Crédito: INSS a recolher.
6. **FGTS a recolher** (linha `Recol FGTS` do rodapé) → despesa de FGTS × FGTS a recolher. Histórico: `FGTS A PAGAR MÊS MM/AAAA`. Valor = `total_recol_fgts_pdf`.
7. **Retenções diversas** (Consignado, Pensão alimentícia, Sindicato, IRRF, Vale-transporte, etc.) → débito em salários a pagar × crédito na obrigação da natureza. Histórico: `[NOME DA VERBA] EM FOLHA MÊS MM/AAAA`.
8. **Verba desconhecida** → escolher a conta mais próxima semanticamente no plano; prefixar histórico com `[SUGERIDO] `. Se realmente não houver conta plausível, deixar `conta_debito`/`conta_credito` null e prefixar com `[REVISAR] `.

### Regras de integridade (mantidas)
- Nenhum código de conta hard-coded — sempre CR do plano do cliente.
- Soma dos lançamentos tipo rendimento = total_rendimentos da tabela. Soma dos descontos = total_descontos. Soma FGTS = total_recol_fgts. Se não bater, marcar `observacoes_ia` com o alerta.
- Data = último dia útil da competência.

## 3. Front-end

Sem redesenho. Ajustes mínimos:
- `TranscricaoEditor.tsx`: mostrar a linha `RECOL_FGTS` normalmente (já cai no fluxo editável).
- `FolhaPagamentoDetail.tsx`: nada muda — Etapa 2 continua disparando automaticamente após transcrição válida.

## 4. Detalhes técnicos

**Arquivos alterados:**
- `supabase/functions/transcrever-folha/index.ts` — prompt reforçado para incluir Recol FGTS como linha.
- `supabase/functions/contabilizar-folha/index.ts` — bloco de regras de agrupamento preenchido; cálculo de sumFGTS acrescentado para validação; classificação de tipo (`rendimento`/`desconto`/`encargo`) refinada.

**O que NÃO muda:**
- Estrutura de `folha_transcricoes` e `folha_lancamentos`.
- Fluxo automático upload → transcrever → contabilizar.
- Validação de divergência da Etapa 1 (bloqueio total).
- Editor manual da transcrição.
