# DANFSe pdfmake POC

Prova de conceito isolada para validar `pdfmake` no Supabase Edge Runtime sem alterar o gerador de produção `dfe-danfe-pdf`.

## Resultado do runtime

- `npm:pdfmake@0.2.20/build/pdfmake.js`: o worker retornou 503 no boot.
- `npm:pdfmake@0.2.20/src/printer.js`: o worker também retornou 503.
- `https://esm.sh/pdfmake@0.2.20/build/pdfmake.js?target=deno`: funciona no Edge Runtime.
- `https://esm.sh/pdfmake@0.2.20/build/vfs_fonts.js?target=deno`: funciona no Edge Runtime.
- Geração real via `createPdf(...).getBase64(...)`: funciona.

## Descoberta sobre imagens

O PNG/base64 usado atualmente como logo da NFS-e derruba o worker do pdfmake no Edge Runtime (503 sem corpo).
Por isso esta POC usa um cabeçalho vetorial/textual provisório. O layout declarativo, QR Code, tabelas, quebras e paginação continuam sendo validados normalmente.

Antes de qualquer troca em produção, a marca oficial deve ser convertida para um asset compatível com o caminho Deno/pdfmake (preferencialmente SVG vetorial ou outro formato validado em runtime).

## Estrutura

- `xml-parser.ts`: extrai e normaliza dados do XML.
- `types.ts`: contrato do objeto intermediário.
- `pdf-definition.ts`: definição declarativa do DANFSe.
- `index.ts`: autenticação interna da POC e geração do PDF.

## Testes executados

1. RAIZEMTEC, chave `27044012264457489000108000000000000126080057794602`.
2. NFS-e 1513, chave `27003002225239639000155000000000151326094738177422`.
3. Teste de estresse com descrição de serviço propositalmente muito longa.

Os três caminhos geraram PDF com HTTP 200 usando o motor `pdfmake-esm-deno`.

## Segurança / integração

A função não está ligada ao frontend e não substitui nenhum download atual.
O endpoint exige o token interno `x-debug-token`.
