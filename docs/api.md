# Contrato planejado da API

Contrato para orientar a implementação e a integração. As rotas ainda não estão disponíveis. Manter os mesmos nomes no front-end, nos DTOs e no Swagger.

## Convenções

- JSON em UTF-8. Todas as rotas abaixo, exceto cadastro e login, exigem `Authorization: Bearer <token>`.
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
| 404 | Recurso solicitado ou relacionado inexistente |
| 409 | E-mail, CNPJ ou MTR duplicado; conflito de estado ou exclusão impedida por vínculo |

Falhas de validação em uma transição retornam 400. Quando a coleta já mudou para um estado final, inclusive por requisição simultânea, a nova tentativa retorna 409.

## Autenticação

| Método e rota | Entrada | Saída |
| --- | --- | --- |
| `POST /auth/cadastro` | `nome`, `email`, `senha` | 201, usuário público |
| `POST /auth/login` | `email`, `senha` | 200, sessão JWT |
| `GET /auth/me` | Token | 200, usuário público atual |

Usar hash bcrypt ou argon2, expiração explícita do JWT, segredo via ambiente e limite de tentativas no login. Detalhes do armazenamento da sessão no navegador serão definidos na etapa de autenticação, junto das proteções correspondentes.

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
