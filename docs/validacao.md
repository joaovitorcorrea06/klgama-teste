# Validação dos requisitos do desafio

Auditoria em 24/11/2026, baseada nas seis páginas do enunciado fornecido pelo candidato. Os requisitos funcionais obrigatórios foram conferidos por código, testes HTTP com PostgreSQL e navegação real. As divergências de apresentação encontradas foram corrigidas.

O envio do e-mail pertence ao candidato. Nenhum e-mail foi enviado nesta validação. O horário exato de recebimento e, portanto, o vencimento das 72 horas não foram verificados em uma caixa de e-mail.

## Evidências técnicas

| Verificação | Resultado |
| --- | --- |
| `npm run check` | Lint sem avisos, tipos, 5 testes de configuração, 14 testes do front-end e build aprovados |
| `npm run test:db` | 47 verificações aprovadas, incluindo agrupadores, com PostgreSQL real e bancos temporários |
| `npm audit --audit-level=moderate` | Nenhuma vulnerabilidade conhecida retornada pelo registro npm na consulta |
| Compose | Build e inicialização em volume novo; migrations aplicadas e serviços saudáveis |
| Demonstração | 96 coletas fictícias em 12 meses; repetição preserva registros existentes |
| GitHub público | Página do repositório retornou HTTP 200 sem credenciais; histórico com commits por etapa |
| Segredos | `.env`, chaves privadas e tokens reais não encontrados nos arquivos versionados e na revisão do histórico |

Os testes usam bancos próprios aleatórios. A revisão destrutiva no navegador usa outro projeto Compose, portas e volume descartáveis; não altera a demonstração principal. Resultado atualizado da CI: [GitHub Actions](https://github.com/joaovitorcorrea06/klgama-teste/actions).

## Modelo e regras de negócio

| Requisito do PDF | Resultado e evidência |
| --- | --- |
| Usuario: campos, e-mail único e hash | Atendido. Entidade/migration; normalização, duplicidade simultânea, bcrypt e exclusão do hash nas respostas em `auth.integration.ts` |
| Cliente: campos, CNPJ único e situação | Atendido. Entidade/migration; formato, normalização, unicidade e edição em `clientes.integration.ts` |
| Coleta: campos e vínculo ao cliente | Atendido. Entidade/migration com FK, unicidade do MTR, datas, auditoria técnica e decimais; `database.integration.ts` e `coletas.integration.ts` |
| Coleta nasce Agendada, sem peso e CDF | Atendido. A API define o estado e rejeita campos proibidos na criação |
| Apenas Agendada → Realizada/Cancelada | Atendido. Estados finais preservados; duas ações concorrentes têm exatamente um vencedor |
| Realização exige peso positivo e data | Atendido. Ausência, zero, negativo, precisão excessiva e datas impossíveis rejeitados |
| CDF somente em realizada e sem antecipação | Atendido. Testes da API e tentativa inválida seguida de gravação válida no navegador |
| Cliente inativo não recebe nova coleta | Atendido. Criação e troca de vínculo protegidas na API, inclusive após bloqueio concorrente; inativo ausente nas opções de novo agendamento |
| Cliente com coletas não é excluído | Atendido. API rejeita exclusão; FK restringe exclusão direta; interface desabilita a ação |
| Valores de receita e despesa não negativos | Atendido. Validação na API e checks no banco. Saldos e somas preservam centavos |
| Regras também na API | Atendido. Requisições HTTP diretas verificam as regras independentemente do front-end |

## API obrigatória

| Item do PDF | Resultado e evidência |
| --- | --- |
| 1. Cadastro/login JWT e proteção das demais rotas | Atendido. Todos os 17 endpoints privados recusam chamadas sem sessão; assinatura, audiência, expiração e existência do usuário verificadas. Swagger também exige JWT |
| 2. CRUD de clientes e coletas vinculadas | Atendido. Criação, leitura, edição e exclusões permitidas/restritas testadas com PostgreSQL |
| 3. Ações de status e CDF | Atendido. Endpoints dedicados, com validação e proteção contra concorrência |
| 4. Paginação e todos os filtros | Atendido. Cliente, status, resíduo, período e sem CDF combináveis; totais reais, páginas fora do intervalo e entradas inválidas testados |
| 5. `GET /painel?inicio=&fim=` com cálculos no banco | Atendido. `painel.query.ts` usa CTEs, `GROUP BY`, somas e contagens em uma consulta; o navegador recebe agregados |
| 6. Validação e códigos HTTP | Atendido. 400 para entradas/regras inválidas, 401 sem sessão válida, 404 para ausência e 409 para duplicidade; testes também cobrem 403 e 429 |
| 7. Migrations versionadas | Atendido. Aplicação em banco vazio, execução repetida, reversão das duas migrations e reaplicação verificadas |
| 8. `.env.example` completo e sem segredos | Atendido. Configuração validada na inicialização; setup gera JWT aleatório e preserva valores configurados |

## Front-end obrigatório

| Item do PDF | Resultado e evidência |
| --- | --- |
| 1. Login e retorno quando a sessão é inválida | Atendido. Cadastro/login pelo navegador, credencial incorreta, restauração após recarregar e testes de sessão |
| 2. Listas e formulários de clientes/coletas | Atendido. Cadastro e edição reais pelo navegador; campos obrigatórios e mensagens por campo conferidos |
| 3. Filtros e paginação pela API | Atendido. Navegação para a segunda página e retorno; todos os filtros combinados retornaram as duas coletas fictícias esperadas |
| 4. Realização, cancelamento e CDF | Atendido. Peso ausente/zero e CDF antecipado recusados; realização, cancelamento definitivo, CDF válido e exclusão permitida conferidos |
| 5. Painel inicial após login | Atendido. Login sem destino específico abre o painel; destino privado solicitado é preservado |
| 6. Carregamento, vazio e erro visíveis | Atendido. Componentes específicos e mensagens de recuperação; busca sem correspondência conferida no navegador |

## Blocos do painel

| Bloco obrigatório | Resultado |
| --- | --- |
| Período por mês inicial/final | Atendido. Meses inclusivos; de 1 a 60 meses; limites e datas inválidas rejeitados; atenção independe do período |
| Quatro cartões | Atendido. Emitidos/média, com CDF/percentual/barra verde, sem CDF/percentual/barra vermelha/selo condicional, saldo/toneladas |
| Receita e despesa | Atendido. Barras agrupadas laranja/azul-escuro, rótulos compactos e saldo acumulado no cabeçalho |
| Rastreabilidade | Atendido. Barras mensais empilhadas em verde e salmão |
| Composição por resíduo | Atendido. Ranking por toneladas, barras proporcionais, toneladas e percentual |
| Evolução mensal | Atendido. Barras com alternância entre Toneladas, Receita e Despesa |
| Precisa de atenção | Atendido. Cartão `#262B3C`, realizadas sem CDF de qualquer data, cinco mais antigas e acesso à lista completa |
| Paleta, estrutura e números brasileiros | Atendido. Cartões brancos arredondados, fundo claro, cores especificadas nos gráficos, Roboto local e apresentação decimal brasileira |

As premissas temporais estão explícitas no README: MTR pela data agendada, financeiro/peso pela realização e CDF pela situação atual. O PDF não fixa essas bases. Meses vazios, denominador zero, canceladas, CDF recebido depois do período, saldo negativo e precisão decimal têm casos com resultados conhecidos em `painel.integration.ts`.

## Conferência no navegador

| Fluxo | Resultado observado |
| --- | --- |
| Acesso | Cadastro fictício, senha incorreta com mensagem, login correto, recarga, logout e tentativa de voltar à rota privada |
| Clientes | Obrigatórios, máscara, criação, edição, busca, inativação, exclusão sem vínculo e lista vazia; exclusão com vínculo indisponível |
| Coletas | Obrigatórios, exclusão do cliente inativo nas opções, cadastro com valores brasileiros, edição, realização, CDF, cancelamento e exclusão de agendamento |
| Filtros | Cliente, status, resíduo, datas e documento combinados; duas linhas correspondentes ao conjunto conhecido; segunda página e retorno |
| Painel | Período sem movimento, atenção inalterada, selo oculto quando não há MTR sem CDF, alternância das três métricas |
| Falha e recuperação | Consulta interrompida apenas na sessão de teste; erro com botão de nova tentativa; carregamento visível e recuperação após liberar a consulta |
| Layout | Painel e formulário de coleta em 390, 768 e 1440 px; login em 390 px; sem transbordamento horizontal da página, com rolagem interna dos gráficos e tabelas quando necessária |
| Teclado e rascunho | Controles do diálogo navegáveis, fundo protegido pela modalidade nativa, Escape preserva o rascunho e confirmação descarta antes de navegar |
| Swagger | Interface carregada com cookie JWT; operação `GET /auth/me` executada pelo “Try it out” retornou 200; documentação retornou 401 após logout |

Capturas locais da auditoria estão em `output/playwright/`, excluídas do Git e do contexto de build.

## Correções desta auditoria

1. Incluídas a barra vermelha e a indicação condicional de atenção no cartão sem CDF.
2. Incluído saldo acumulado no cabeçalho financeiro.
3. Evolução mensal alterada de linha para barras, conforme o PDF; componentes de linha sem uso removidos.
4. Rótulos financeiros mantidos em telas estreitas e períodos extensos por rolagem interna do gráfico, com alternativa em tabela.
5. Swagger passou a exigir o mesmo JWT do portal, tanto na página quanto nos recursos e no JSON. A validação de token é compartilhada com o guard da API.
6. Adicionados testes de acesso sem sessão a todos os 17 endpoints privados e de autenticação do Swagger por cookie/Bearer.

## Diferenciais e limites

| Diferencial citado no PDF | Situação |
| --- | --- |
| Docker Compose | Entregue |
| Swagger/OpenAPI | Entregue, opcional por configuração e protegido por JWT |
| Testes automatizados | Regras de status/CDF verificadas por integração HTTP com banco real; painel tem testes com totais conhecidos. Não há suíte unitária isolada dos services de status/CDF |
| Detalhamento ao clicar no painel | Parcial: cartão de atenção leva à lista filtrada e cada pendência abre o registro; barras e ranking não abrem detalhamento |
| Comparação com período anterior | Não implementada |
| Composição mensal expansível | Não implementada |
| Perfis Admin/Operador | Não implementados; operação fictícia compartilhada |
| Upload do CDF | Não implementado; registra-se a data |
| Histórico de quem mudou o status | Não implementado; existem timestamps técnicos |
| CNPJ por dígitos verificadores | Parcial: máscara, formato e unicidade entregues; cálculo dos dígitos não implementado |
| Seed de 12 meses | Entregue, fictício e idempotente |
| CI | Entregue, com jobs de qualidade/integração e Compose |
| Deploy público da aplicação | Não realizado; repositório público e execução local em Docker disponíveis |
| Segurança básica | Rate limit, CORS restrito, hash de senha, validação de JWT, cookie HttpOnly e ausência de segredos reais versionados |
| Três melhorias no README | Entregues, com justificativas sobre bases temporais, pendências e alternativas tabulares |

## Conferência antes do envio

- Repositório público com histórico: conferido sem login.
- Instalação, configuração e execução: verificadas em ambiente limpo e descritas no README.
- Escopo e suposições: documentados; diferenciais não implementados identificados acima.
- Tempo aproximado de dedicação informado pelo candidato: 12 horas.
- Deploy e usuário: sem deploy público; conta fictícia local documentada.
- Prazo de 72 horas e envio: responsabilidade do candidato; nenhum e-mail enviado.

A revisão visual usa navegador Chromium e emulação de tamanhos de tela. Não equivale a certificação de acessibilidade, teste em aparelhos físicos, avaliação em todos os navegadores ou teste de carga. A matriz descreve o escopo conferido; a nota do processo seletivo depende da avaliação da empresa.
