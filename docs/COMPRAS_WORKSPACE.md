# Compras Workspace

Fluxo dedicado de Compras baseado nos relatórios de Entrada de Mercadoria já alinhados no projeto.

- Transcrição: preserva cada entrada individual do relatório.
- Conferência: compara quantidade e valor do PDF com a transcrição e com o lançamento consolidado.
- Lançamento: um único lançamento por competência, no último dia do mês, somando todas as entradas.
- Histórico padrão: `MERCADORIA PRA REVENDA (COMPRAS)`.
- Débito/crédito: resolvidos pelo plano de contas atual e pela memória aprovada da empresa; C.R.s históricos não são hardcoded globalmente.
