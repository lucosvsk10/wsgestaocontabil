# Mercado Pago — ativação de assinaturas e pagamentos avulsos

O checkout da WS usa páginas hospedadas pelo Mercado Pago. Dados de cartão não passam pelo frontend nem são armazenados pela WS.

## 1. Criar a aplicação

1. Entre em **Mercado Pago Developers > Suas integrações** com a conta que receberá os pagamentos.
2. Clique em **Criar aplicação**.
3. Use um nome como `WS Gestão Contábil — Emissor e Extrator`.
4. Selecione pagamentos online e habilite **Checkout Pro** e **Assinaturas** quando essas opções forem apresentadas.
5. Primeiro use credenciais de teste. Só troque para produção depois do teste completo com conta compradora diferente da conta vendedora.

## 2. Configurar o webhook

Cadastre esta URL nas notificações da aplicação:

```text
https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/mp-webhook?source_news=webhooks
```

Eventos necessários:

- Pagamentos (`payment`)
- Assinaturas / preapproval (`subscription_preapproval`)
- Pagamentos recorrentes autorizados (`subscription_authorized_payment`)

Depois de salvar, copie a **assinatura secreta do webhook**. Ela é diferente do Access Token.

## 3. Cadastrar os secrets no Supabase

Em **Supabase > Project Settings > Edge Functions > Secrets**, cadastre:

```text
MERCADO_PAGO_ACCESS_TOKEN=TEST-...
MERCADO_PAGO_WEBHOOK_SECRET=...
MERCADO_PAGO_SELLER_EMAIL=email-da-conta-recebedora
PUBLIC_SITE_URL=https://wsgestaocontabil.com
```

Não coloque Access Token ou segredo do webhook em variáveis `VITE_*`, no GitHub ou em mensagens de chat. A Public Key não é necessária no fluxo atual porque o pagamento é aberto no checkout hospedado do Mercado Pago.

## 4. Testar antes de produção

1. Crie comprador e cartão de teste no painel do Mercado Pago.
2. Cadastre-se no site por um CTA do Emissor ou Extrator.
3. Teste assinatura mensal: o checkout deve mostrar o teste de 7 dias e autorizar o meio de pagamento.
4. Confirme que o retorno libera o produto e cria a assinatura no painel administrativo.
5. Teste a opção de 30 dias: ela deve cobrar imediatamente e não criar renovação automática.
6. Envie uma notificação de teste pelo painel e confirme resposta HTTP 200.
7. Faça um pagamento aprovado, um pendente e um recusado.
8. Só então troque o Access Token pelo de produção e repita uma compra real de baixo risco com outra conta.

## Produtos configurados

- Emissor Fiscal: R$ 69/mês, emissões ilimitadas.
- Extrator Comercial: R$ 99/mês, até 20.000 XML mensais.
- Extrator Empresarial: R$ 250/mês, XML e empresas ilimitados.
- Assinaturas recorrentes: 7 dias grátis uma única vez por usuário/empresa e produto.
- Compra avulsa: 30 dias de acesso, cobrada na hora e sem renovação.

## Controles implementados

- Plano, valor e elegibilidade ao teste são validados no servidor.
- Um usuário ou empresa só pode resgatar um teste por produto.
- O webhook valida `x-signature` e consulta o objeto diretamente na API do Mercado Pago.
- Eventos de pagamento são idempotentes e não liberam acesso com moeda ou valor divergente.
- O acesso avulso expira em 30 dias; a assinatura é renovada pelos eventos do Mercado Pago.
- Ao cancelar uma renovação, o período já pago permanece disponível até o vencimento.
- Tabelas de tentativa, consentimento e eventos são exclusivas do backend e protegidas por RLS.
