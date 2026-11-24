# Contrato da API

Contrato para orientar a implementação e a integração. Autenticação, clientes, coletas e painel estão implementados. Manter os mesmos nomes no front-end, nos DTOs e no Swagger.

## Convenções

- JSON em UTF-8. Todas as rotas abaixo, exceto cadastro e login, exigem JWT via `Authorization: Bearer <token>` ou cookie HttpOnly de sessão do portal.
- IDs UUID; datas civis `YYYY-MM-DD`; decimais como strings com ponto, sem símbolo ou separador de milhar.
- Cadastro retorna dados públicos do usuário. Login retorna token, tipo `Bearer`, duração em segundos e usuário público. Nunca devolver senha ou hash.
- Rejeitar campos desconhecidos e conversões ambíguas. Parâmetros de paginação são inteiros; booleanos aceitam apenas `true` e `false`.
- Erros têm `statusCode`, `code`, `message` e, quando houver, erros por campo. Mensagens apresentáveis em português, sem stack trace.

| HTTP | Aplicação |
| --- | --- |
| 200 | Consulta ou atualização concluída |
| 201 | Recurso criado |
| 204 | Exclusão concluída sem corpo |
| 400 | Formato, campo, período ou regra de negócio inválida |
| 401 | Token ausente, expirado ou inválido; credenciais incorretas |
| 403 | Origem inválida para uma operação de alteração usando cookie |
| 404 | Recurso solicitado ou relacionado inexistente |
| 409 | E-mail, CNPJ ou MTR duplicado; conflito de estado ou exclusão impedida por vínculo |

Falhas de validação em uma transição retornam 400. Quando a coleta já mudou para um estado final, inclusive por requisição simultânea, a nova tentativa retorna 409.

## Autenticação

| Método e rota | Entrada | Saída |
| --- | --- | --- |
| `POST /auth/cadastro` | `nome`, `email`, `senha` | 201, usuário público |
| `POST /auth/login` | `email`, `senha` | 200, sessão JWT |
| `GET /auth/me` | JWT | 200, `{ usuario, expiraEm }` |
| `POST /auth/logout` | JWT; `Origin` correto se usar cookie | 204, remove cookie |

Login retorna `{ accessToken, tokenType: "Bearer", expiresIn, usuario }` e define cookie `ecocoleta_session` HttpOnly, SameSite=Strict e Path=/. `expiresIn` está em segundos; `expiraEm` é ISO 8601 UTC. Cadastro devolve usuário público, sem iniciar sessão. Usuário público tem `id`, `nome`, `email` e `criadoEm`.

Senha: bcrypt custo 12, mínimo de 10 caracteres no cadastro e máximo de 72 bytes UTF-8. E-mail aparado e convertido para minúsculas; nome tem espaços excedentes normalizados. Campos desconhecidos retornam 400, com `errors` contendo mensagens por campo.

JWT: HS256, issuer `ecocoleta-api`, audience `ecocoleta-portal`, sujeito UUID de usuário existente e expiração explícita. O navegador não armazena token em Web Storage. A sessão é restaurada por `/auth/me`. Logout apaga cookie; não revoga JWT já copiado por um cliente REST.

No acesso por cookie, mutações exigem `Origin` exatamente igual a `WEB_ORIGIN`; clientes REST podem usar Bearer sem cookie. Login e cadastro rejeitam origem explicitamente diferente. A API deve ser consumida pelo proxy `/api` no navegador. Cookie Secure é obrigatório com origem HTTPS.

Login aceita 10 tentativas/minuto/IP e cadastro, 5. Ao exceder, retorna 429 com `Retry-After`. O armazenamento do limitador é em memória e reinicia com o processo; uma instalação com múltiplas réplicas precisará de armazenamento compartilhado.

## Clientes

| Método e rota | Comportamento |
| --- | --- |
| `GET /clientes` | Lista paginada; filtros `busca` e `ativo` |
| `POST /clientes` | Cria com `nome`, `cnpj`, `cidade`, `uf` e `ativo` opcional, padrão true |
| `GET /clientes/:id` | Detalhe |
| `PATCH /clientes/:id` | Atualiza os campos permitidos; `ativo` permite inativar e reativar |
| `DELETE /clientes/:id` | Exclui somente sem coletas vinculadas; retorna 204 |

Nome, CNPJ, cidade e UF obrigatórios. UF validada contra a lista de unidades federativas. Vinculação de uma coleta a cliente inexistente retorna 404; a cliente inativo, 400.

As respostas de listagem e detalhe de cliente incluem `possuiColetas`, booleano calculado no banco. Campos públicos do cliente: `id`, `nome`, `cnpj`, `cidade`, `uf`, `ativo`, `criadoEm`. Datas de criação em ISO 8601 UTC. Cadastro e atualização devolvem os campos públicos; a listagem seguinte atualiza a indicação de vínculo.

`busca` tem até 150 caracteres e procura trechos em nome, cidade e CNPJ sem distinguir maiúsculas e minúsculas. Pontuação do CNPJ é normalizada para a busca. Curingas de SQL são escapados e todos os valores são parametrizados. `ativo` na query aceita somente `true` ou `false`; no corpo exige booleano JSON. Um PATCH vazio ou com campos nulos retorna 400. CNPJ duplicado retorna 409; exclusão com coletas também retorna 409. Detalhe, atualização e exclusão de ID inexistente retornam 404.

## Coletas

| Método e rota | Comportamento |
| --- | --- |
| `GET /coletas` | Lista com os filtros abaixo |
| `POST /coletas` | Cria coleta agendada |
| `GET /coletas/residuos?busca=` | Até 20 sugestões distintas de resíduos, ordenadas; busca parcial literal |
| `GET /coletas/:id` | Detalhe com identificação pública do cliente |
| `PATCH /coletas/:id` | Edita somente campos permitidos para o estado atual |
| `DELETE /coletas/:id` | Exclui somente agendada; retorna 204 |
| `PATCH /coletas/:id/realizar` | Recebe `pesoKg` e `dataRealizada` |
| `PATCH /coletas/:id/cancelar` | Cancela uma agendada |
| `PATCH /coletas/:id/cdf` | Recebe `dataCdf` de uma realizada |

Criação exige `clienteId`, `numeroMtr`, `tipoResiduo` e `dataAgendada`. `valorReceita`, `valorDespesa` e `observacao` são opcionais. Status e campos de realização e CDF só entram pelas ações dedicadas.

Filtros combináveis: `clienteId`, `status`, `tipoResiduo`, `inicio`, `fim` e `semCdf`. Tipo de resíduo tem correspondência exata após normalização. `semCdf=true` significa campo CDF ausente em qualquer estado; combinar com `status=Realizada` produz as pendências ambientais. `semCdf=false` seleciona somente CDF preenchido.

`inicio` e `fim` filtram a data agendada. Datas inválidas ou intervalo invertido retornam 400. Parâmetros ausentes não aplicam aquele limite.

Coletas retornam os campos públicos do registro e `cliente` com identificação pública. Valores monetários são strings de até 12 dígitos inteiros e 2 casas; peso tem até 11 inteiros e 3 casas, maior que zero. Não aceitar expoentes, símbolos, agrupamento de milhar nem números JSON. Datas civis aceitam anos de 1000 a 9999 e validam o calendário. Campos opcionais omitidos recebem os padrões; nulos são rejeitados. Observação pode ser limpa com string vazia. Cancelamento recebe corpo vazio ou `{}` e rejeita campos.

`GET /coletas/residuos` é autenticado; `busca` tem até 160 caracteres. Retorna `{ itens: string[], limite: 20 }`. A interface oferece essas sugestões sem impedir novos tipos.

### Paginação

Todas as listas usam `pagina` a partir de 1, padrão 1, e `limite` de 1 a 100, padrão 20. Clientes e coletas aceitam até a página 100000. Resposta: `itens` e `meta` com `pagina`, `limite`, `total` e `totalPaginas`. Em lista vazia, total e total de páginas são zero. Uma página além do resultado devolve itens vazios, preservando a contagem real dos filtros.

Ordenação estável: clientes por nome e ID; coletas por data agendada decrescente e ID. Filtros são aplicados antes da contagem e da paginação.

## Painel

`GET /painel?inicio=2026-01&fim=2026-12`

Meses inclusivos, de 1 a 60 por consulta. Sem parâmetros, últimos 12 meses incluindo o atual de São Paulo. Com apenas `fim`, início retrocede 11 meses; com apenas `inicio`, fim é o mês atual. Meses inválidos, período invertido, extensão maior que 60 meses e parâmetros desconhecidos retornam 400.

| Campo da resposta | Conteúdo |
| --- | --- |
| `periodo` | Meses inicial e final e quantidade de meses |
| `indicadores` | `emitidos`, `mediaMensalMtr`, `comCdf`, `semCdf`, `percentualComCdf`, `percentualSemCdf`, `receita`, `despesa`, `saldo`, `toneladas` |
| `financeiroMensal` | Mês, receita, despesa e saldo |
| `rastreabilidadeMensal` | Mês, com CDF e sem CDF |
| `composicaoResiduos` | Tipo, toneladas e percentual do total, em ranking |
| `evolucaoMensal` | Mês, toneladas, receita e despesa |
| `atencao` | Total atual de realizadas sem CDF e até cinco itens, sem recorte de período |

Itens de atenção mostram ID, MTR, cliente e data realizada. Ordenar pelas mais antigas, com ID como desempate. A interface deve distinguir total e quantidade exibida e oferecer acesso à lista completa com `status=Realizada&semCdf=true`, sem herdar o período do painel.

Datas de referência e fórmulas seguem [Regras e decisões de negócio](regras.md). Todos os valores financeiros, pesos, toneladas, médias e percentuais seguem a convenção decimal em string. Contagens são números inteiros. As duas séries de rastreabilidade somam o total de MTR, inclusive quando o total é zero.

## Documentação e infraestrutura

Swagger está implementado em `/docs`, com contrato JSON em `/docs/openapi.json`. Pelo proxy web, use `/api/docs`. Os 19 endpoints documentam entradas, respostas, autenticação e erros. A interface, os recursos estáticos e o contrato exigem autenticação Basic independente; ela não autoriza as rotas de negócio, que continuam protegidas por JWT.

A documentação fica desabilitada por padrão. Para habilitar, configure `SWAGGER_ENABLED=true` e execute `npm run setup`: uma senha aleatória é gerada em `SWAGGER_PASSWORD` quando necessário. O usuário está em `SWAGGER_USER`. Reinicie/recrie a API após alterar a configuração. Consulte o [README](../README.md) para o procedimento completo. Credenciais reais não são versionadas.
