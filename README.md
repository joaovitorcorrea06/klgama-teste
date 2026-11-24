# EcoColeta — coletas e indicadores

[![Verificação do projeto](https://github.com/joaovitorcorrea06/klgama-teste/actions/workflows/ci.yml/badge.svg)](https://github.com/joaovitorcorrea06/klgama-teste/actions/workflows/ci.yml)

Aplicação do desafio Fullstack Júnior da KL GAMA para a empresa fictícia **EcoColeta**. Permite gerenciar clientes e coletas de resíduos, acompanhar MTR/CDF e consultar indicadores operacionais e financeiros.

**Stack:** Vue 3 + TypeScript, NestJS, PostgreSQL 17, TypeORM com migrations, Chart.js e Docker Compose. Dados de demonstração inteiramente fictícios.

## Executar com Docker

### 1. Preparar as ferramentas

Instale **Git**, **Node 24 LTS** e **Docker com Compose v2**. No Windows/macOS, abra o Docker Desktop e aguarde o mecanismo iniciar. No Linux, mantenha o Docker Engine em execução. Confira no terminal:

```sh
git --version
node --version
docker info
docker compose version
```

O Node local executa o script de configuração. As dependências, os builds de Vue/Nest e a execução da aplicação ficam nos containers; não é necessário instalar PostgreSQL na máquina. A versão mínima da linha Node 24 é 24.11; o `.nvmrc` seleciona essa linha.

### 2. Clonar e entrar no projeto

```sh
git clone https://github.com/joaovitorcorrea06/klgama-teste.git
cd klgama-teste
```

Execute os próximos comandos nessa pasta, onde estão `package.json` e `compose.yaml`.

### 3. Gerar a configuração local

```sh
npm run setup
```

O comando cria `.env` a partir de `.env.example`, gera um segredo JWT aleatório e preserva valores já configurados. Não é necessário executar `npm ci` para esse script. O arquivo fica apenas na sua máquina, fora do Git e do build das imagens.

As configurações padrão já atendem à execução local:

| Serviço | Acesso no host |
| --- | --- |
| Portal | `http://localhost:5173` |
| API | `http://localhost:3000` |
| PostgreSQL | `127.0.0.1:5432` |

As portas são publicadas somente em loopback. Dentro do Compose, a API usa o serviço `db`; o portal encaminha `/api` para a API pela rede interna. Não substitua esses endereços internos por `localhost`.

### 4. Construir e iniciar os serviços

```sh
docker compose up -d --build --wait
```

Na primeira execução, o Docker baixa as imagens e instala as dependências fixadas no lockfile. O Compose inicia o PostgreSQL, aguarda sua disponibilidade, aplica as migrations e inicia API e portal. O terminal retorna quando os serviços ficam saudáveis.

Confira:

```sh
docker compose ps -a
```

`db`, `api` e `web` devem aparecer em execução e saudáveis. O serviço `migrate` terminar com **Exited (0)** é esperado: ele aplica as migrations e encerra com sucesso. Não é preciso criar tabelas nem rodar migrations manualmente.

### 5. Carregar a demonstração fictícia

Com os serviços em execução:

```sh
docker compose exec -T -e NODE_ENV=development api node apps/api/dist/database/seed.js
```

Esse comando usa o código compilado dentro do container e adiciona quatro clientes e **96 coletas em 12 meses**. A variável `NODE_ENV` vale apenas para esse processo de carga fictícia; a API continua em modo de produção. Repetir a carga preserva registros existentes e não limpa o banco.

### 6. Acessar o portal

Abra **http://localhost:5173** e entre com a conta fictícia:

| Acesso de demonstração | Valor |
| --- | --- |
| E-mail | `demo@ecocoleta.example` |
| Senha | `EcoColetaDemo2026!` |

O painel já terá agendamentos, realizações, cancelamentos e CDF recebidos ou pendentes. Também é possível criar uma conta pela tela de cadastro. A senha acima é pública e exclusiva da demonstração local.

### Parar, retomar e atualizar

```sh
# Parar e remover os containers, preservando os dados
docker compose down

# Retomar usando as imagens já construídas
docker compose up -d --wait

# Reconstruir após atualizar o código
docker compose up -d --build --wait
```

O PostgreSQL persiste no volume `postgres_data`. **`docker compose down -v` apaga esse volume e todos os dados**; use somente se quiser reiniciar uma demonstração descartável do zero. Depois será necessário subir os serviços e executar a carga fictícia novamente.

Para acompanhar os logs:

```sh
docker compose logs --tail=100 api migrate db
docker compose logs -f api web
```

`Ctrl+C` encerra o acompanhamento dos logs e mantém os serviços em execução.

### Resolver problemas de inicialização

| Sintoma | O que conferir |
| --- | --- |
| Não conecta ao Docker | Abra o Docker Desktop ou inicie o Docker Engine; `docker info` deve funcionar antes do Compose |
| Porta já está em uso | Ajuste `WEB_PORT`, `API_PORT` ou `DB_PORT` no `.env`. Se alterar `WEB_PORT`, atualize também `WEB_ORIGIN` para a URL do portal |
| API recusa `JWT_SECRET` | Execute `npm run setup`; o placeholder de `.env.example` precisa ser substituído pelo segredo gerado |
| `migrate` termina com código diferente de zero | Consulte `docker compose logs migrate db`; confira a configuração do banco e sua disponibilidade |
| Login de demonstração não funciona | Execute a carga fictícia do passo 5 depois de os serviços estarem saudáveis |
| Swagger retorna 404 | Ele é opcional; veja a seção de API e Swagger para habilitá-lo |
| Swagger retorna 401 | Entre primeiro no portal e abra a documentação no mesmo navegador e origem |

Exemplo de portas alternativas no `.env`:

```dotenv
WEB_PORT=5174
WEB_ORIGIN=http://localhost:5174
API_PORT=3001
DB_PORT=5433
```

Depois aplique a configuração com `docker compose up -d --build --wait` e acesse `http://localhost:5174`. Alterar as portas publicadas não muda as portas internas dos containers. Se já houver um volume inicializado, mantenha as credenciais de banco usadas na sua criação.

## Roteiro rápido de demonstração

1. Entre na conta fictícia e consulte os quatro cartões, os gráficos e o ranking de resíduos. Altere o período e a métrica da evolução.
2. Abra “Ver pendências e registrar CDF”: a lista recebe `status=Realizada&semCdf=true`, sem herdar o período do painel.
3. Cadastre um cliente fictício e uma coleta. Informe valores como `1250,50` na interface; o contrato REST usa strings com ponto, como `"1250.50"`.
4. Realize a coleta com peso positivo e data; registre um CDF igual ou posterior à realização. Confira a atualização do painel.
5. Confira uma tentativa inválida: MTR duplicado, CDF antecipado ou exclusão de cliente com coletas. A regra permanece protegida em requisições diretas à API.

## Funcionalidades entregues

- Cadastro, login JWT, restauração da sessão e logout. Cookie HttpOnly/SameSite=Strict no portal; Bearer para clientes REST.
- Clientes: CRUD, busca por nome/cidade/CNPJ, filtro de situação, paginação e proteção do histórico vinculado.
- Coletas: cadastro, edição, filtros combináveis, paginação, realização, cancelamento e registro/correção de CDF.
- Painel: MTR emitidos, média mensal, com/sem CDF, saldo e toneladas; financeiro mensal, rastreabilidade empilhada, composição por resíduo, evolução e atenção atual.
- Interface em português, Roboto local, estados de carregamento/erro/vazio, confirmação de ações, aviso de alterações não salvas, foco de teclado e tabelas acessíveis dos gráficos.
- Docker Compose, migrations versionadas, documentação Swagger protegida, demonstração fictícia e GitHub Actions.

## Arquitetura

```text
Navegador -> Vue 3 -> /api (Nginx) -> NestJS -> PostgreSQL 17
```

No desenvolvimento local, o Vite assume o encaminhamento de `/api` feito pelo Nginx no Docker.

```text
apps/api/src/       autenticação, usuários, clientes, coletas, painel e documentação
apps/api/test/      testes HTTP e PostgreSQL com bancos temporários isolados
apps/web/src/       páginas Vue, componentes, sessão, serviços e estilos
apps/web/test/      testes de sessão, filtros e apresentação decimal
docs/              contrato HTTP, decisões e evidências da revisão visual
scripts/setup.mjs  preparação idempotente do ambiente local
.github/workflows/ci.yml
```

Controllers tratam HTTP, DTOs validam entradas e services aplicam as regras. O banco mantém unicidade, FK e checks como proteção adicional. `synchronize` e migrations automáticas na API estão desabilitados; alterações de esquema são versionadas.

Dependências diretas fixadas e árvore reproduzível no `package-lock.json`: Vue 3.5.46, NestJS 11.2.11, TypeORM 1.1.3, Swagger 11.4.8 e Chart.js 4.6.2. Os gráficos são carregados na rota do painel.

## Regras e decisões principais

| Regra | Implementação |
| --- | --- |
| Criação de coleta | Sempre agendada, sem peso, realização ou CDF; campos proibidos são rejeitados |
| Transições | Somente Agendada → Realizada ou Cancelada, ambas definitivas |
| Realização | Peso maior que zero e data obrigatórios |
| CDF | Somente em realizada, com data igual ou posterior à realização |
| Cliente inativo | Impede novas vinculações; histórico e coletas preexistentes continuam válidos |
| Exclusão | Cliente somente sem coletas; coleta somente enquanto agendada |
| Estado final | PATCH comum permite apenas observação; CDF usa endpoint próprio |
| Concorrência | Unicidade no banco; transições condicionadas ao estado anterior; bloqueio/transação ao conferir e vincular cliente |
| Precisão | Dinheiro `numeric(14,2)` e peso `numeric(14,3)`; strings decimais no JSON |
| Datas | Datas civis `DATE`/`YYYY-MM-DD`; timestamps técnicos em UTC |

E-mail é aparado e convertido para minúsculas, CNPJ perde pontuação e MTR é normalizado para maiúsculas. A primeira versão valida formato de 14 dígitos do CNPJ, sem cálculo de dígitos verificadores. Tipo de resíduo é texto com espaços normalizados e sugestões dos valores existentes.

**Bases temporais do painel:** MTR seguem a data agendada; financeiro e toneladas seguem a realização. Canceladas não contribuem. O CDF representa a situação atual do documento, mesmo se recebido depois do período. Atenção considera todas as realizadas sem CDF, sem filtro temporal.

O período aceita de 1 a 60 meses inclusivos e usa, por padrão, os últimos 12 meses pelo calendário de São Paulo. Meses vazios são preenchidos com zero. Totais, séries, percentuais e ranking vêm de agregações SQL em uma consulta consistente. O navegador converte valores em números apenas para desenhar os gráficos; a apresentação decimal usa arredondamento exato com BigInt.

### Três melhorias em relação à referência

1. Bases temporais explícitas por bloco e indicação de que atenção ignora o período.
2. Pendências identificadas por MTR, cliente e data, com acesso à lista para registrar CDF.
3. Alternativas tabulares para conferir os valores completos sem depender de cor ou hover.

## API e Swagger

O [contrato HTTP](docs/api.md) detalha os endpoints. Negócio protegido por JWT; somente cadastro e login são públicos. Erros usam `{ statusCode, code, message, errors? }`, com 400, 401, 403, 404, 409 e 429 conforme o caso.

Swagger é **opcional e desabilitado por padrão**. Para habilitar localmente:

1. Defina `SWAGGER_ENABLED=true` no `.env`.
2. Recrie a API com `docker compose up -d --no-deps --force-recreate --wait api`.
3. Entre no portal em **http://localhost:5173**.
4. Abra **http://localhost:5173/api/docs** no mesmo navegador. O JWT em cookie HttpOnly autoriza a documentação.

A mesma validação de JWT protege página, JavaScript, CSS e especificação em `/api/docs/openapi.json`. Sem token válido, todos retornam 401. Clientes REST também podem usar Bearer. Para “Try it out”, a sessão do portal funciona pelo proxy; se preferir, faça login pelo Swagger e informe o `accessToken` em **Authorize**. A documentação deve ser aberta pelo proxy do portal para manter a origem de autenticação configurada. A autorização não é persistida pelo Swagger após recarregar.

O Swagger documenta os **19 endpoints**, seus DTOs, respostas, paginação, filtros, decimais e regras de transição. A implementação segue a [documentação oficial do NestJS](https://docs.nestjs.com/openapi/introduction); esses recursos são middleware e precisam de proteção anterior ao `setup`, além do guard global.

## Testes e CI

Com Node 24 no host e o PostgreSQL do Compose em execução:

```sh
npm ci
npm run check
npm run test:db
```

- `check`: lint sem avisos, tipos, **5 testes de configuração**, **14 testes do front-end** e build das duas aplicações.
- `test:db`: **47 verificações de integração**, incluindo agrupadores, com PostgreSQL real. Cobrem migrations/reversão, autenticação, clientes, coletas, concorrência, precisão, painel, demonstração idempotente e proteção/contrato do Swagger.
- Testes de integração criam e removem apenas bancos próprios com nomes aleatórios. Exigem usuário PostgreSQL com permissão de criar bancos; não limpam o banco principal. Não usar credenciais de produção.
- [GitHub Actions](https://github.com/joaovitorcorrea06/klgama-teste/actions) executa qualidade/integração com PostgreSQL 17 e um job separado de build/inicialização do Compose, em pushes e pull requests. Actions fixadas por commit e permissões somente de leitura.

**Reprodução limpa validada:** cópia sem `node_modules`, `.env`, `dist` ou dados prévios; `npm ci`, setup, build das imagens com Node 24, migrations em volume novo, verificações e demonstração. Um fluxo HTTP pelo Nginx conferiu cookie/origem, cliente, coleta, realização, CDF, saldo decimal e Swagger protegido, inclusive seus recursos locais. O ambiente descartável usa portas/volume próprios e é removido ao terminar.

**Revisão visual:** Chrome em 390, 768 e 1440 px, com teclado, foco no erro, filtros vazios, gráficos, diálogo e recuperação após indisponibilidade da API. Evidências e limites da revisão em [Interface](docs/interface.md). A conferência foi em emulação, sem aparelho físico ou leitor de tela externo.

## Desenvolvimento local

Para usar Vite/Nest no host e somente o banco em Docker:

```sh
npm ci
docker compose stop web api
npm run db:up
npm run db:migrate
npm run db:check
npm run dev
```

Portal em `http://localhost:5173` e API em `http://localhost:3000`. Vite e Nginx encaminham `/api` removendo o prefixo. Acessar `/` da API retorna 404 JSON, comportamento esperado.

O `.env` fica na raiz. Não defina `NODE_ENV` nele, pois é compartilhado com o Vite; containers definem production diretamente. `JWT_SECRET`, credenciais e valores privados nunca devem receber prefixo `VITE_`. Para HTTPS, use `COOKIE_SECURE=true` e a origem HTTPS correta. `API_TRUST_PROXY=true` confia em um salto e é usado no Compose atrás do Nginx.

`npm run db:revert` desfaz a última migration. A reversão da migration inicial remove as tabelas: usar somente em ambiente descartável.

## Limites e próximos passos

- Todos os usuários atuam na mesma operação fictícia; não há perfis ou isolamento por usuário.
- Logout remove o cookie; JWT copiado por um cliente REST continua válido até expirar. Não há refresh token nem revogação antecipada.
- Limitação de tentativas em memória por instância; múltiplas réplicas exigem armazenamento compartilhado.
- CDF registra a data; upload do documento e trilha de auditoria ficam como evolução.
- Comparação com período anterior, normalização avançada dos resíduos e validação completa de CNPJ podem evoluir após os requisitos obrigatórios.

## Tempo aproximado

Aproximadamente **12 horas** de dedicação.

## Documentação adicional

- [Regras e decisões de negócio](docs/regras.md)
- [Contrato da API](docs/api.md)
- [Direção visual e evidências da revisão](docs/interface.md)
- [Plano e critérios de entrega](docs/plano.md)
- [Validação contra os requisitos do PDF](docs/validacao.md)
