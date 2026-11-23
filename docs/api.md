# Contrato planejado da API

Contrato para orientar a implementação e a integração. As rotas de autenticação estão implementadas; clientes, coletas e painel permanecem planejados. Manter os mesmos nomes no front-end, nos DTOs e no Swagger.

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

## Coletas

| Método e rota | Comportamento |
| --- | --- |
| `GET /coletas` | Lista com os filtros abaixo |
| `POST /coletas` | Cria coleta agendada |
| `GET /coletas/:id` | Detalhe com identificação pública do cliente |
| `PATCH /coletas/:id` | Edita somente campos permitidos para o estado atual |
| `DELETE /coletas/:id` | Exclui somente agendada; retorna 204 |
| `PATCH /coletas/:id/realizar` | Recebe `pesoKg` e `dataRealizada` |
| `PATCH /coletas/:id/cancelar` | Cancela uma agendada |
| `PATCH /coletas/:id/cdf` | Recebe `dataCdf` de uma realizada |

Criação exige `clienteId`, `numeroMtr`, `tipoResiduo` e `dataAgendada`. `valorReceita`, `valorDespesa` e `observacao` são opcionais. Status e campos de realização e CDF só entram pelas ações dedicadas.

Filtros combináveis: `clienteId`, `status`, `tipoResiduo`, `inicio`, `fim` e `semCdf`. Tipo de resíduo tem correspondência exata após normalização. `semCdf=true` significa campo CDF ausente em qualquer estado; combinar com `status=Realizada` produz as pendências ambientais. `semCdf=false` seleciona somente CDF preenchido.

`inicio` e `fim` filtram a data agendada. Datas inválidas ou intervalo invertido retornam 400. Parâmetros ausentes não aplicam aquele limite.

### Paginação

Todas as listas usam `pagina` a partir de 1, padrão 1, e `limite` de 1 a 100, padrão 20. Resposta: `itens` e `meta` com `pagina`, `limite`, `total` e `totalPaginas`. Em lista vazia, total e total de páginas são zero.

Ordenação estável: clientes por nome e ID; coletas por data agendada decrescente e ID. Filtros são aplicados antes da contagem e da paginação.

## Painel

`GET /painel?inicio=2026-01&fim=2026-12`

| Campo da resposta | Conteúdo |
| --- | --- |
| `periodo` | Meses inicial e final e quantidade de meses |
| `indicadores` | Emitidos, média mensal, com e sem CDF e percentuais, receita, despesa, saldo e toneladas |
| `financeiroMensal` | Mês, receita, despesa e saldo |
| `rastreabilidadeMensal` | Mês, com CDF e sem CDF |
| `composicaoResiduos` | Tipo, toneladas e percentual do total, em ranking |
| `evolucaoMensal` | Mês, toneladas, receita e despesa |
| `atencao` | Total atual de realizadas sem CDF e até cinco itens, sem recorte de período |

Itens de atenção mostram ID, MTR, cliente e data realizada. Ordenar pelas mais antigas, com ID como desempate. A interface deve distinguir total e quantidade exibida e oferecer acesso à lista completa com `status=Realizada&semCdf=true`, sem herdar o período do painel.

Datas de referência e fórmulas seguem [Regras e decisões de negócio](regras.md). Todos os valores financeiros, pesos, toneladas, médias e percentuais seguem a convenção decimal em string. Contagens são números inteiros. As duas séries de rastreabilidade somam o total de MTR, inclusive quando o total é zero.

## Documentação e infraestrutura

Swagger é um diferencial priorizado. Como o enunciado exige proteção fora de cadastro e login, a documentação será protegida por autenticação separada e habilitada explicitamente por configuração. Ela não cria uma rota de negócio anônima. Variáveis, portas e procedimentos serão documentados na etapa de base técnica.
