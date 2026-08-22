# Importação de faturamento com múltiplas competências

- O conteúdo do documento, nunca o nome do arquivo, define ano e mês.
- Um relatório anual é lido inteiro e distribuído por competência.
- A soma das competências é reconciliada com os totais anuais explícitos quando existirem.
- O usuário recebe um resumo com ano, competência, linhas importadas e valores.
- Linhas podem ser excluídas individualmente; a conferência passa a bloquear a exportação se houver divergência.
- A exclusão do documento usa o importId para remover todas as competências geradas por aquele arquivo.
