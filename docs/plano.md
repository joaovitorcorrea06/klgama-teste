# Plano de execução

Construir uma entrega funcional e consistente dentro de 72 horas, com prioridade para as regras da API, os indicadores corretos e a fidelidade visual às referências. Cada parte termina com uma verificação concreta e uma explicação do fluxo implementado.

## Partes e critérios de conclusão

| Parte | Trabalho | Critério de conclusão |
| --- | --- | --- |
| 1. Especificação | Requisitos, decisões, contrato HTTP e direção visual | Documentação coerente, com obrigatórios separados de escolhas e diferenciais |
| 2. Base técnica | Aplicações, configuração, PostgreSQL, migrations iniciais e Docker Compose | Web e API sobem; banco persiste; migration funciona em banco vazio; build e tipos passam; `.env.example` completo |
| 3. Autenticação | Cadastro, hash de senha, login, JWT e telas de acesso | E-mail duplicado retorna 409; credenciais inválidas e token ausente ou expirado retornam 401; senha e hash nunca saem na resposta; logout e expiração funcionam na interface |
| 4. Clientes | CRUD, busca, paginação e ativação | CNPJ único; cliente com coleta não é excluído; inativação e mensagens funcionam de ponta a ponta |
| 5. Coletas | CRUD, filtros, paginação, transições e CDF | Todas as regras resistem a requisições diretas; ações da interface usam endpoints dedicados; testes de transição e CDF passam |
| 6. Painel | Agregações SQL, gráficos, indicadores e dados de demonstração | Todos os blocos obrigatórios presentes; teste de integração confere totais; atenção ignora período; meses vazios e denominador zero funcionam |
| 7. Acabamento | Responsividade, teclado, mensagens e revisão de todas as telas | Fluxos revisados em 390, 768 e 1440 px, sem sobreposição; gráficos e tabelas legíveis; carregamento, erro e vazio conferidos |
| 8. Entrega | CI, README, ambiente limpo e revisão final | Instalação reproduzida do zero; lint, tipos, build e testes passam; commits legíveis; repositório público verificado; checklist final preenchido |

As partes 1 e 2 estão concluídas. A base passou por lint, tipos, build, testes de configuração e integração com PostgreSQL, execução em Docker Compose e verificação HTTP em modo local. Os módulos de negócio continuam pendentes. A inspeção visual depende da disponibilidade do navegador e será retomada na revisão de interface.

## Distribuição do prazo

- Primeiro dia: base técnica, autenticação e clientes; avançar nas regras de coletas.
- Segundo dia: concluir coletas, integrar telas e entregar os blocos do painel.
- Terceiro dia: integração, revisão visual, correções, documentação e reprodução em ambiente limpo.

Se houver atraso, retirar diferenciais de menor prioridade antes de reduzir os obrigatórios. Não deixar regras críticas para o último dia.

## Checklist obrigatório

### API

- [ ] Cadastro e login JWT; demais endpoints de negócio autenticados.
- [ ] CRUD de clientes e coletas com vínculo obrigatório entre eles.
- [ ] Transições e registro de CDF com validações na API.
- [ ] Paginação e filtros combináveis por cliente, status, resíduo, período e sem CDF.
- [ ] `GET /painel?inicio=&fim=` com agregações feitas no banco.
- [ ] Respostas 400, 401, 404 e 409 conforme o contrato.
- [x] Migrations versionadas e `.env.example` sem segredos reais.

### Interface

- [ ] Login e retorno ao login quando a sessão não for válida.
- [ ] Listas e formulários de clientes e coletas.
- [ ] Filtros e paginação utilizando a API.
- [ ] Ações de realizar, cancelar e registrar CDF.
- [ ] Painel como página inicial após o login.
- [ ] Todos os sete blocos do painel, incluindo quatro cartões de indicador.
- [ ] Carregamento, erro e lista vazia visíveis.
- [ ] Identidade visual e números em português brasileiro.

### Entrega

- [ ] Dados inteiramente fictícios.
- [ ] Repositório público com histórico de commits por entrega concluída.
- [ ] README com instalação, configuração e execução verificadas em pasta limpa.
- [ ] README com decisões, requisitos entregues e tempo aproximado dedicado.
- [ ] Nenhuma senha real, token, `.env` ou arquivo de CDF real versionado.
- [ ] Resposta ao e-mail com o link do repositório feita pelo candidato dentro do prazo.

## Verificações prioritárias

1. Testes de regras: criação sempre agendada; peso inválido; transição repetida ou proibida; CDF antecipado; cliente inativo; cliente com vínculo; tentativa de contornar ações pelo PATCH comum.
2. Integração com PostgreSQL: constraints de duplicidade; vínculo de cliente; filtros e paginação; agregações com meses vazios, canceladas, agendadas e realizadas; atualizações simultâneas de status.
3. Teste do painel com conjunto pequeno de valores conhecidos, incluindo coleta agendada em um mês e realizada em outro, CDF registrado depois do período, valores decimais e pendência fora do período.
4. Fluxo completo no navegador: cadastrar, entrar, criar cliente e coleta, realizar, registrar CDF, filtrar e conferir indicadores; repetir falhas relevantes.

## Histórico de desenvolvimento

Fazer commits por mudanças concluídas e revisadas: planejamento, base, autenticação, clientes, coletas, painel e revisão. Nunca marcar uma etapa como pronta apenas porque os arquivos foram criados. Registrar validações e limitações no fechamento de cada parte.
