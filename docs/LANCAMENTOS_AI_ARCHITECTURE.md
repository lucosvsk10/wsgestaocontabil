# Arquitetura da IA — Central de Lançamentos

## Princípio

A IA aprende a **função contábil** da conta, nunca um C.R. fixo. A regra global pode dizer
“debitar Fornecedores”; o resolvedor da empresa transforma esse papel no C.R. existente no plano
de contas dela.

## Pipeline único

1. Receber o documento e registrar empresa, competência e módulo.
2. Extrair dados do arquivo sem decidir contas.
3. Classificar os fatos contábeis usando regras versionadas do módulo.
4. Resolver cada papel contábil no plano de contas da empresa.
5. Validar contas analíticas, datas, duplicidade e totais até o centavo.
6. Gerar apenas um rascunho estruturado.
7. Exigir confirmação humana antes de considerar o módulo lançado.
8. Salvar a diferença entre sugestão e confirmação como feedback reutilizável.

## Camadas de conhecimento

- `lancamento_ai_rules`: regras globais limpas e versionadas por módulo.
- `lancamento_account_roles`: correspondência entre papel contábil e C.R. por empresa.
- `lancamento_ai_feedback`: exemplos aprovados de correções, sem reescrever o prompt principal.
- `lancamento_period_modules`: estado operacional de cada empresa, competência e módulo.

## Integração OpenAI

- Usar a Responses API a partir de uma Supabase Edge Function; a chave nunca vai para o navegador.
- Enviar PDFs como `input_file` e planilhas no formato de arquivo suportado.
- Exigir Structured Outputs com JSON Schema único para os lançamentos.
- Usar `store: false` porque os documentos contêm dados contábeis de clientes.
- Manter o modelo configurável por variável de ambiente e validar custo/qualidade por módulo.
- A resposta do modelo nunca grava diretamente no razão: primeiro passa pelos validadores e pela revisão humana.

## Validações obrigatórias

- Somatórios do documento e dos lançamentos devem coincidir até o centavo.
- Débito e crédito precisam existir no plano e ser contas analíticas.
- Nenhum pagamento pode ser inferido sem evidência documental.
- A competência e a data do lançamento precisam ser consistentes.
- Reprocessar um documento substitui o rascunho anterior, sem duplicar lançamentos.
- Correções aprovadas viram exemplos da empresa; sugestões rejeitadas não são aprendidas.

## Estratégia de evolução

Começar com regras, recuperação de exemplos aprovados e Structured Outputs. Fine-tuning só deve ser
avaliado depois de existir um conjunto grande, limpo e medido de exemplos. Antes disso, regras
versionadas e feedback confirmado são mais auditáveis, baratos e fáceis de corrigir.
