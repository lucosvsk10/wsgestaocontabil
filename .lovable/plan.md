## Plano

1. **Fazer a IA extrair também os totais oficiais do documento**
   - No processamento de folha, além dos lançamentos agrupados, a IA deverá retornar obrigatoriamente:
     - `total_rendimentos_documento`
     - `total_descontos_documento`
     - `total_liquido_documento` quando existir no PDF
   - Esses valores devem ser copiados do resumo/totalizador do próprio PDF, não calculados pela IA.

2. **Validar matematicamente antes de salvar no banco**
   - Depois que a IA gerar os lançamentos, o código vai somar as linhas geradas por tipo:
     - Rendimentos/proventos
     - Descontos/retenções
   - A soma dos lançamentos gerados precisa bater centavo por centavo com os totais extraídos do documento.
   - Se houver diferença, o processamento **não deve salvar como se estivesse correto**.

3. **Tratar divergência como erro de revisão, não como lançamento válido**
   - Se o PDF diz, por exemplo, `Rendimentos: 15.000,00`, mas os lançamentos somam outro valor:
     - O upload será marcado com erro/revisão.
     - A mensagem vai informar: total do documento, total gerado e diferença.
   - Isso evita que a planilha chegue ao editor com valor inventado, ajustado ou incompleto.

4. **Permitir agrupamento apenas quando preserva o total**
   - A IA poderá continuar unificando contas/verbas quando fizer sentido.
   - Mas cada linha agrupada deverá explicar na justificativa quais verbas foram somadas.
   - A soma final dos agrupamentos precisa ser exatamente igual ao documento original.

5. **Melhorar o prompt da folha**
   - Reforçar que a prioridade absoluta é bater com os totais oficiais do PDF.
   - Proibir completar diferenças com “ajustes”, arredondamentos ou suposições.
   - Se não conseguir identificar uma verba ou total, deve marcar para revisão em vez de chutar.

6. **Ajustar a tela do editor da folha**
   - Manter os totais separados em verde/vermelho:
     - Rendimentos
     - Descontos
     - Líquido
   - Se houver totais do documento disponíveis, mostrar a conferência entre “Documento” e “Planilha”.
   - Se houver divergência, destacar claramente para revisão.

## Detalhes técnicos

- Arquivo principal: `supabase/functions/process-folha-pagamento/index.ts`.
- O retorno JSON da IA passará a incluir os totais oficiais do PDF.
- Será criada uma função de validação no processamento:

```text
soma_rendimentos_lancamentos === total_rendimentos_documento
soma_descontos_lancamentos === total_descontos_documento
soma_liquido_lancamentos === total_liquido_documento, quando informado
```

- A tolerância será de no máximo `R$ 0,01` apenas para diferença de ponto flutuante do JavaScript, nunca para aceitar erro real.
- Se a divergência for maior que isso, o upload fica com `status = erro` e `ultimo_erro` explicando a diferença.
- Não vou reintroduzir nenhuma lógica que cria linhas sintéticas ou recalcula salário por campos separados.