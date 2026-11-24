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

As partes 1 a 6 estão implementadas e com validação técnica concluída. Clientes passaram por oito cenários de integração com PostgreSQL e conferência dos fluxos no Chrome em desktop e tablet. A inspeção móvel de clientes ficou pendente por indisponibilidade do controle da janela e será retomada na parte 7. Coletas passaram por dez cenários de integração com PostgreSQL, incluindo concorrência, precisão, filtros e CDF. Cadastro, realização e registro de CDF foram conferidos no Chrome em desktop; a revisão em 390 e 768 px permanece na parte 7. Painel integrado, com agregações SQL, meses zerados, bases temporais distintas, atenção global e demonstração idempotente de 12 meses. A suíte PostgreSQL tem 40 verificações aprovadas, incluindo agrupadores. Cartões, gráficos, tabela e troca de métrica conferidos no Chrome em desktop; revisão responsiva completa permanece na parte 7.

## Distribuição do prazo

- Primeiro dia: base técnica, autenticação e clientes; avançar nas regras de coletas.
- Segundo dia: concluir coletas, integrar telas e entregar os blocos do painel.
- Terceiro dia: integração, revisão visual, correções, documentação e reprodução em ambiente limpo.

Se houver atraso, retirar diferenciais de menor prioridade antes de reduzir os obrigatórios. Não deixar regras críticas para o último dia.

## Checklist obrigatório

### API

- [x] Cadastro e login JWT; guard global para endpoints atuais e futuros.
- [x] CRUD de clientes e coletas com vínculo obrigatório entre eles.
- [x] Parcela de clientes: CRUD, paginação, busca, situação, CNPJ único e exclusão impedida quando há coletas.
- [x] Transições e registro de CDF com validações na API.
- [x] Paginação e filtros combináveis por cliente, status, resíduo, período e sem CDF.
- [x] `GET /painel?inicio=&fim=` com agregações feitas no banco.
- [x] Respostas 400, 401, 404 e 409 conforme o contrato.
- [x] Migrations versionadas e `.env.example` sem segredos reais.

### Interface

- [x] Login e retorno ao login quando a sessão não for válida, com testes de lógica e conferência no Chrome.
- [x] Listas e formulários de clientes e coletas.
- [x] Parcela de clientes: lista, filtros na URL, formulário, edição e ações de situação, com confirmação e proteção de alterações não salvas.
- [x] Filtros e paginação utilizando a API.
- [x] Ações de realizar, cancelar e registrar CDF.
- [x] Painel como página inicial após o login.
- [x] Todos os sete blocos do painel, incluindo quatro cartões de indicador.
- [x] Carregamento, erro e lista vazia visíveis.
- [x] Identidade visual e números em português brasileiro.

### Entrega

- [x] Dados inteiramente fictícios.
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
