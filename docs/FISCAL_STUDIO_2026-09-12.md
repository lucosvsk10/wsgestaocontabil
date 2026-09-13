# Emissor fiscal — redesign de 12/09/2026

## Escopo e continuidade

Prioridade do usuário: emissor fiscal. Pendentes para ciclos separados: extrator fiscal, visual do painel de documentos do cliente e testes completos do Mercado Pago. Home e guias já foram revisados pelo usuário. Não usar o chat da Lovable; somente consultar/publicar.

Os cinco fluxos compartilham uma nova camada visual isolada, em `src/styles/fiscal-studio.css`: NF-e, NFC-e, NFS-e, CT-e e MDF-e. Etapas horizontais, área de preenchimento mais ampla, empresa recolhível, resumo lateral, pesquisa de cadastros em janela com documento/endereço/contato e valores. Tipografia existente preservada. A antiga camada `saas-emission-workspace.css` não é mais importada.

Referências consultadas:

- [21st.dev — Form Layout](https://21st.dev/@ephraimduncan/components/form-layout)
- [21st.dev — Multistep Form](https://21st.dev/@arihantcodes_1f7b8c4d/components/multistep-form)
- [21st.dev — organização de etapas](https://21st.dev/blog/react-onboarding-stepper-components)

## Preenchimento e classificações

- Cliente/produto/serviço: busca por nome, código interno, documento, classificação e contato. Dados vêm do cadastro; valores editados permanecem no rascunho.
- Empresa da conta disponível como participante no CT-e e contratante no MDF-e. Certificado e emitente continuam vinculados à empresa da conta. IDs antigos de clientes permanecem utilizáveis.
- CFOP do produto selecionado usa o cadastro interestadual quando o cliente está em outra UF. Não inventa tratamento tributário fora dos cadastros.
- Município: busca IBGE, seleção pelo teclado e preenchimento manual quando a consulta falha.
- NCM: busca por código/descrição na tabela da BrasilAPI, com códigos de oito dígitos vigentes. Não envia dados empresariais/pessoais ao serviço. Falha de rede mantém digitação manual.
- Serviços: 338 códigos nacionais únicos de seis dígitos da [tabela oficial Anexo B v1.01 de 22/01/2026](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/anexo_b-nbs2-lista_servico_nacional-snnfse-v1-01-20260122.xlsx). Fonte numérica normalizada com zeros à esquerda; descrição original preservada. Não confundir com CNAE, NBS ou código municipal. Dataset carregado sob demanda. Atualizar a tabela em futuras revisões oficiais.
- [Documentação da consulta NCM](https://github.com/BrasilAPI/BrasilAPI/blob/main/pages/docs/doc/ncm.json).

## Rascunhos

Salvamento automático em localStorage por organização e tipo de documento. Minhas notas separa emitidas e rascunhos; banner permite retomar e descarte exige confirmação. Preenchimentos parciais com apenas placa também aparecem. Etapa antiga/inválida volta à primeira etapa mantendo os dados.

Limitação explícita: um rascunho por tipo, neste navegador. Não sincroniza entre computadores e não substitui armazenamento no servidor. Limpar os dados do navegador elimina esses rascunhos. Nenhuma migração ou alteração de RLS foi feita nesta rodada.

## Verificação

- 22 testes Vitest: contratos de payload dos cinco emissores, dupla submissão, erros 422, restauração, isolamento de rascunhos, participante emitente, etapa inválida, busca e integridade da tabela nacional.
- Componentes reais renderizados em Edge/Playwright com consultas da conta substituídas por fixtures fictícias. Mesmas folhas de estilo e estrutura principal de conteúdo do aplicativo.
- 23 etapas verificadas em 1440 px e 390 px, com capturas e verificação de rolagem horizontal.
- NF-e preenchida desde o cliente até a prévia: documento formatado, busca por SKU, alteração do preço, reload, pagamento e conferência do payload.
- Cinco rascunhos independentes e confirmação de descarte.
- Build Vite e geração das páginas SEO concluídos. O typecheck global ainda aponta problemas preexistentes em useDashboardData, SaasDanfePreview (lib ES2020/replaceAll), processRevenueBatch e FiscalExtractorApp. Nenhum erro nos arquivos alterados deste redesign.

Os testes de prévia usam respostas simuladas; não comprovam autorização pela SEFAZ/município. Não houve emissão, cancelamento, pagamento nem transmissão fiscal real nesta rodada. NFS-e em homologação continua limitada à prévia no fluxo existente. Não apresentar esta entrega visual como certificação fiscal universal.

## Publicação

Frontend oficial: GitHub `lucosvsk10/wsgestaocontabil`, branch `main`, publicação pela Lovable, projeto `5e706f60-c0ad-4339-891b-be603ad97031`. Não criar projeto frontend paralelo na Vercel. Marcador da interface: `fiscal-studio-20260912`.
