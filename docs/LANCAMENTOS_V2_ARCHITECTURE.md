# Lançamentos V2 — base funcional

## Objetivo

Transformar documentos mensais em duas planilhas auditáveis:

1. lançamentos contábeis para importação no Calima;
2. ajustes do balancete, gerados somente depois da conferência do balancete exportado pelo Calima.

Nenhum valor demonstrativo deve ser misturado com dados reais. Uma competência vazia começa sem transcrições, lançamentos, resultados de conferência ou saldos.

## Fluxo da competência

1. Selecionar empresa, ano e mês.
2. Importar documentos por módulo: folha, compras, faturamento e despesas.
3. Processar cada arquivo preservando sua origem e impedindo duplicidade por checksum.
4. Revisar a transcrição extraída.
5. Gerar rascunhos de lançamentos com conta de débito, conta de crédito, histórico e valor.
6. Executar validações determinísticas.
7. Exigir revisão humana para ambiguidades e bloqueios.
8. Exportar uma única planilha de lançamentos para o Calima.
9. Importar o balancete resultante.
10. Analisar os saldos e exportar uma segunda planilha apenas com os ajustes necessários.

## Fonte da verdade

O Supabase deve guardar os fatos permanentes, separados por empresa:

- plano de contas e códigos reduzidos;
- equivalência entre papéis contábeis e contas da empresa;
- regras aprovadas e versões dessas regras;
- competências, arquivos, checksums e estados de processamento;
- transcrições, lançamentos, correções e aprovações;
- histórico de auditoria e versão do modelo/prompt usados;
- balancetes e ajustes gerados.

O histórico completo não deve ser enviado ao modelo em toda solicitação. O servidor monta um contexto compacto contendo somente as contas, regras e exemplos aprovados relevantes ao módulo e à empresa atual.

## Responsabilidade da IA

A IA auxilia na leitura, normalização e classificação. Ela recebe o documento atual, o contexto compacto da empresa e um esquema de saída estrito. Ela não aprova o próprio resultado e não grava lançamentos definitivos diretamente.

## Barreiras contra erro

- valores monetários são armazenados em centavos inteiros, nunca em ponto flutuante;
- totais do documento e dos lançamentos são recalculados pelo sistema;
- débito e crédito precisam fechar exatamente;
- códigos reduzidos devem existir no plano de contas ativo da empresa;
- datas devem pertencer à competência ou possuir justificativa explícita;
- um checksum impede reprocessamento e importação duplicada;
- baixa confiança, conta ausente ou diferença de centavos bloqueia a exportação;
- toda edição manual registra usuário, data, valor anterior e valor novo;
- regras aprendidas só entram no contexto da empresa após aprovação humana.

## Economia de tokens

- enviar apenas páginas e trechos relevantes ao módulo;
- reutilizar resultado de arquivos com checksum idêntico;
- recuperar apenas regras e mapeamentos relacionados à classificação atual;
- processar arquivos em lotes e consolidar resultados antes da conferência;
- manter prompts curtos, versionados e saídas estruturadas;
- usar processamento assíncrono em lote para volumes anuais não urgentes.

## Fases de implementação

### 1. Importação segura

Persistir arquivo, metadados, competência, módulo, checksum e estado. Exibir progresso e erros reais.

### 2. Extração estruturada

Criar processamento no servidor e contratos de saída por módulo. Nenhuma chave de provedor de IA deve chegar ao navegador.

### 3. Plano de contas e regras

Implementar mapeamentos por empresa, busca de contas e aprovação de regras aprendidas.

### 4. Validação e revisão

Construir o motor determinístico, painel de bloqueios e trilha de auditoria.

### 5. Exportações

Gerar o XLSX único do mês e, após o balancete, o XLSX separado de ajustes.

### 6. Avaliação antes da produção

Montar casos de referência anonimizados com resultados esperados, executar regressões a cada alteração de modelo, prompt ou regra e impedir publicação quando algum caso crítico falhar.
