# Mercado Pago — ativação do checkout

O checkout usa o Checkout Pro. O navegador nunca recebe o Access Token: uma Edge Function autenticada cria a preferência e o webhook confirma o pagamento consultando a API do Mercado Pago.

## 1. Criar ou selecionar a aplicação

1. Entre em **Mercado Pago Developers > Suas integrações**.
2. Crie uma aplicação, ou selecione a aplicação da WS Gestão Contábil.
3. Selecione **Checkout Pro** como produto.

## 2. Configurar primeiro o ambiente de teste

Copie o **Access Token de teste**. Ele começa normalmente com `TEST-`.

Cadastre os seguintes secrets no projeto Supabase `nadtoitgkukzbghtbohm`:

```text
MERCADO_PAGO_ACCESS_TOKEN=TEST-...
MERCADO_PAGO_WEBHOOK_SECRET=...
MERCADO_PAGO_SELLER_EMAIL=email-da-conta-recebedora
PUBLIC_SITE_URL=https://wsgestaocontabil.com
```

`MERCADO_PAGO_SELLER_EMAIL` é uma proteção opcional contra a conta recebedora pagar a própria cobrança. Nenhuma dessas variáveis deve ser adicionada ao frontend ou receber o prefixo `VITE_`.

## 3. Configurar o webhook

No painel da aplicação, abra **Webhooks** e configure separadamente em teste e produção:

```text
https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/mp-webhook
```

Selecione o evento **Pagamentos**, salve e copie a **assinatura secreta** gerada para `MERCADO_PAGO_WEBHOOK_SECRET`.

## 4. Fazer o teste completo

1. Use uma conta compradora de teste diferente da conta vendedora.
2. Entre no site com um usuário que pertença à empresa da fatura.
3. Abra uma fatura com status `open` ou `overdue`.
4. Escolha Pix, cartão ou boleto, aceite os termos e prossiga.
5. Conclua no Checkout Pro.
6. Confirme que o retorno abre a mesma fatura e que, em pagamento aprovado, o status muda para `paid` após o webhook.
7. Repita uma notificação de teste e confirme que não ocorre baixa duplicada.

## 5. Ativar produção

1. Conclua a homologação solicitada pelo Mercado Pago.
2. Troque o Access Token de teste pelo **Access Token de produção**.
3. Configure o webhook também no modo produção e substitua o secret se ele for diferente.
4. Faça uma cobrança real de valor baixo, usando uma conta pagadora diferente da recebedora.

## Controles implementados

- A fatura e o valor são lidos no servidor, nunca aceitos do navegador.
- O usuário só cria checkout para fatura acessível pela política RLS da própria organização.
- O endpoint limita tentativas por usuário e reutiliza preferências para evitar cobranças duplicadas.
- O webhook valida `x-signature`, consulta o pagamento na API do Mercado Pago e compara fatura, moeda e valor.
- Eventos são idempotentes; somente o backend pode gravar tentativas, eventos e baixar a fatura.
- Logs e tabelas internas não armazenam o payload bruto nem dados de cartão.
