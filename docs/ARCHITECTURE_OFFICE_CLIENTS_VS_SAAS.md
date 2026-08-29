# WS Gestão — fronteira entre clientes do escritório e futuro SaaS

## Regra atual

`public.companies` representa exclusivamente empresas clientes do escritório WS Gestão.

Essas empresas podem ter extensões operacionais sem criar um novo cadastro da empresa:

- `company_user_links`: acesso ao portal do cliente para receber documentos;
- `documents.company_id`: documentos enviados pelo escritório;
- `fiscal_companies.company_id`: configuração fiscal e certificado A1 usados internamente pela WS;
- `carousel_items.company_id`: presença opcional no carrossel.

O usuário de portal não é a empresa. É apenas uma credencial de acesso vinculada à empresa.

O perfil fiscal não é a empresa. É apenas a configuração fiscal vinculada à empresa.

## Futuro SaaS

O futuro produto de extração/emissão fiscal para empresas externas não deve reutilizar `public.companies` como cadastro de assinantes.

Quando esse produto for iniciado, ele terá uma entidade própria de conta/assinante e seus próprios vínculos de usuários e empresas fiscais. Isso será criado somente na fase do SaaS, depois da refatoração atual.

## Objetivo desta fase

Deixar o sistema atual do escritório consistente, novo e funcional sem introduzir estruturas do SaaS antes da hora.
