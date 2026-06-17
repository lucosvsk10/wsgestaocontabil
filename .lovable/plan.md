## Objetivo
Eliminar qualquer etapa de "mapear CFOPs". O usuário só seleciona as linhas; o sistema decide débito/crédito automaticamente pela regra fixa de CFOP.

## Regra fixa (hardcoded)
- CFOP **1101 / 2101** → Débito **493** | Crédito **777**
- CFOP **1407 / 1556 / 2407 / 2556** → Débito **494** | Crédito **777**
- CFOP **1102 / 2102** (comercialização) → Débito **486** | Crédito **777**
- Qualquer outro CFOP → a linha **não é pré-selecionada** (despesa/utilidade). Se o usuário marcar manualmente, o sistema bloqueia com aviso "CFOP não suportado para lançamento de compras".

## Mudanças

### Frontend — `ComprasDetail.tsx`
- Remover botão **"Mapear CFOPs"** do cabeçalho.
- Remover toda referência a `mappedCfops` / `CfopMappingDialog` / coluna "Mapeamento" do modal.
- Modal de seleção fica só com: checkbox, CFOP, Descrição, Vr. Contábil.
- Pré-seleção feita pela própria IA continua valendo (CFOPs da regra fixa já vêm marcados).

### Frontend — arquivos a deletar
- `src/components/admin/lancamentos/compras/CfopMappingDialog.tsx`

### Edge function — `process-compras-cfop`
- Remover leitura da tabela `compras_cfop_mapping`.
- Prompt da IA já contém a regra fixa (1101→Débito/Crédito etc.) e marca `selecionado=true` apenas para os CFOPs da regra.

### Edge function — `confirm-compras-lancamentos`
- Remover lookup em `compras_cfop_mapping`.
- Resolver Débito/Crédito direto via `switch (cfop)` com a regra fixa.
- Se vier CFOP fora da regra → erro 400 explicando.

### Banco de dados
- A tabela `compras_cfop_mapping` deixa de ser usada. **Não vou deletar** a tabela para não perder histórico/migrations — só paro de ler/gravar nela. (Se preferir DROP, me avise.)

## Fluxo final
1. Upload do PDF.
2. IA extrai automaticamente e abre o modal.
3. Usuário marca/desmarca linhas (as 3 famílias de CFOP já vêm marcadas).
4. "Confirmar e lançar" → backend monta débito/crédito pela regra fixa e redireciona pro editor.
