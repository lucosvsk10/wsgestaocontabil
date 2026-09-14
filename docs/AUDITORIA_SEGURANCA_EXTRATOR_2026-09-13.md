# Auditoria de segurança e revisão do Extrator — 13/09/2026

Status: lote principal publicado em 14/09/2026, commit 9c3402a9056a7f5a70029789788d84dc678bed4f. Auditoria abrangente ainda tem pendências; não é declaração de ausência de vulnerabilidades.

## Já aplicado no servidor

- Revogado vínculo de empresa por CNPJ sem comprovação e escrita direta dos vínculos do extrator.
- Removido upload anônimo em public-site-assets; leitura pública dos assets preservada.
- Rate limiter serializado também para primeiro acesso concorrente; sincronização manual limitada a 3/5min e respeita backoff.
- Importação de A1 atômica (empresa + certificado criptografado + vínculo). Renovação preserva cadastro e ambiente. Vínculo a empresa preexistente de outra conta exige conferência administrativa; ler CNPJ de PFX não equivale a validar cadeia ICP-Brasil.
- Respostas individuais de enquete não são mais publicamente legíveis. Validação de opção/pergunta/expiração, tamanho e limites de respostas no banco.
- Histórico do extrator limitado a 3 solicitações/10min, com período válido e preço/status controlados.
- Flags de troca de senha não podem ser autoatestadas pelo navegador; confirmação depende de atualização efetiva pelo Auth.
- Nove handlers legados sem referências no frontend nem em funções/jobs SQL foram aposentados (HTTP410): fiscal-sync, enhanced-fiscal-sync, fetch-fiscal-notes, manage-user-bucket, align-document, process-document-queue, confirm-compras-lancamentos, process-compras-cfop, search-cnpj. Nenhum dado foi apagado. Backup local em work/security-retired-backup, não publicar.
- Publicados: extractor-company-config v156, fiscal-bulk-download v633, dfe-danfe-pdf v700, fiscal-document-recover v596, saas-registry-lookup v253. Limites por usuário, JSON limitado, A1 até2MB, pacote até100 registros/15MB de XML e timeout por PDF.
- Atualização posterior publicada: extractor-company-config v157 (salvar nome da conta), auth-login v8, fiscal-bulk-download v634, fiscal-document-recover v597, saas-dfe-issue v13, saas-cte-issue v16, saas-mdfe-issue v20 e saas-nfse-issue v517. Rate limit nos emissores: 60 solicitações/10min por usuário, incluindo prévias; nenhum teste transmitiu nota.
- Perguntas de formulários privados agora seguem a visibilidade da enquete. Uploads antes sem limite receberam limite de tamanho; simuladores têm limite por usuário no banco.
- RPC de contexto de documentos, executável somente por service_role, aplica vínculo, assinatura ativa e janela histórica aos downloads e à recuperação. Administradores preservam o acesso operacional existente.

## Evidências já obtidas

- SQL transacional com rollback: quarta chamada após limite3 bloqueada; falha de NOT NULL ao persistir novo certificado reverte a desativação anterior; grants de vínculo e RPC de certificado negados ao cliente.
- SQL com fixtures descartadas por rollback: voto válido aceito; opção de outra enquete e enquete expirada recusadas.
- 13 testes de entradas (JSON, datas, A1, CSV) e 8 contratos de backend do extrator passaram.
- 5 testes de interface do extrator +6 testes de interface A1 do emissor passaram; total32 na rodada conjunta.
- Rodada após atualização de dependências: 65 testes passaram em 11 arquivos (extrator e emissor). Inclui 3 testes adicionais de autorização/janela histórica. São testes automatizados com simulações, não homologação fiscal real.
- Build Vite e TypeScript passaram. Última reconstrução inclui proteção contra respostas assíncronas antigas em documentos/relatórios, timeout de consulta e seleção de período por dia.
- Inventariadas166 funções no servidor. Recuperação em lote encontrou limite da API de administração; não significa que todas foram manualmente auditadas.
- Nenhum SECURITY DEFINER público executável por anon na consulta de grants.
- Headers HTTP observados: HSTS, nosniff, referrer policy. CSP também existe em meta no HTML; frame-ancestors exige header HTTP, não se garante por meta.
- Navegador autenticado: Visão geral, Empresas e Certificados do extrator carregaram com a empresa existente; há2 documentos armazenados. Não foi substituído A1 real nem emitida nota.

## Pendências reais para continuidade

- Lote principal publicado e confirmado no navegador: novo diálogo A1, botão explícito Validar e salvar, validação de envio vazio e edição do nome da conta presentes.
- Revisar o restante das funções remotas e pontes Vercel, incluindo consumo/segredos.
- Dependências: aplicado npm audit fix sem --force e sem scripts de instalação, mais correções de compatibilidade de testing-library e eslint-plugin-react. Restaram 11 alertas (3 high, 8 moderate), não zero. Incluem xlsx sem correção no registro npm, migrações maiores de Vite/Vitest/React Router/uuid e brace-expansion. Tarball oficial SheetJS bloqueado pela política allow-remote do npm; proteção não foi desativada. Referência: https://docs.sheetjs.com/docs/getting-started/installation/nodejs/
- Pontes Vercel: três projetos confirmados READY. Código local da ponte DFe usa HMAC com validade de 5min, comparação constante, TLS validado, body limitado e timeout. Fontes implantadas de SVRS/NFS-e não estão neste repositório; não considerar revisão de código dessas pontes concluída.
- Provar fluxos live de documentos, relatórios, histórico e conta após publicação, sem mexer em documentos reais.
- Proteção de senhas vazadas desativada no Supabase; não habilitada por SQL e não anunciar como ativa. Referência: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- pg_net no schema public e quatro RPCs SECURITY DEFINER do extrator são alertas a acompanhar; não abrir RLS de tabelas de serviço para eliminar avisos.
- Não foram feitos testes de carga, pentest destrutivo, novas emissões, cobranças, troca de credenciais, validação real de cadeia ICP-Brasil ou teste de todos os papéis/tenants.

## Verificação adicional — 14/09

- Testes HTTP reais com chave pública anônima: importador, download, recuperação e quatro endpoints SaaS de emissão recusaram acesso (401). Login vazio recusado (400), corpo excessivo recusado (413), handler legado aposentado retornou410. Não foram enviadas credenciais reais nem dados fiscais para esses testes.
- Ponte DFe sem assinatura retornou401. Ponte SVRS com corpo vazio retornou400: validação de entrada confirmada, autenticação da ponte NÃO comprovada. Ponte NFS-e apresentou erro de conexão em duas tentativas; não classificar como aprovada ou vulnerável só por isso.
- Navegador: todas as sete abas principais do extrator abriram. Relatórios e visão geral conferiram2 documentos e R$637,24. Não foi enviado pedido retroativo nem acionada emissão.
- Descoberta funcional: vendas da empresa selecionada estavam queued desde11/09, sem credencial estadual AL, embora A1 estivesse ativo. O cron ignorava a empresa sem registrar o motivo. fiscal-sales-cron v650 passa a persistir waiting_state_credentials/waiting_certificate. Um status queued foi corrigido para a pendência real, sem alterar certificado, credencial ou cursor. UI distingue fila e credencial pendente.
- Bloqueio real: concluir consulta de vendas pelo conector AL exige cadastrar a credencial estadual legítima. Não inventada nem solicitada em texto. A falta não afeta a conferência dos XML já armazenados.
- Mais4 testes do cron passaram: credencial ausente, certificado ausente, empresa pausada e chamada sem token. Nenhum acessou SEFAZ; total69 testes aprovados somando as duas rodadas.
- Salvamento da conta testado no site: nome temporário salvo e confirmado na tela; restauração do nome original enviada em seguida. Sem mudança em email, senha, CNPJ ou assinatura.
