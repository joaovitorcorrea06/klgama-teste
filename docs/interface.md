# Direção visual e critérios de interface

O portal deve reproduzir a identidade e a estrutura do painel de resíduos da referência, com hierarquia clara, dados legíveis e formulários consistentes. Os valores das imagens são demonstrações; o produto exibirá exclusivamente os resultados da API.

## Sistema visual

| Elemento | Direção |
| --- | --- |
| Receita, toneladas, seleção e ação principal | Laranja `#F26D27` |
| Despesa e cartão de atenção | Azul-escuro `#262B3C` |
| CDF recebido e saldo positivo | Verde `#2E7D32` |
| Pendência crítica e saldo negativo | Vermelho `#C62828` |
| Sem CDF nas barras empilhadas | Salmão `#FFCCBC` |
| Texto secundário | Cinza `#727376`, com contraste verificado no fundo real |
| Fundo e trilhos | `#F5F5F5` e `#ECECEC` |
| Superfícies | Cartões brancos, borda discreta, cantos de 12 a 16 px e sombra suave |
| Tipografia | Roboto hospedada com a aplicação e fallback sans-serif; corpo 16 px, legendas 12 a 14 px, títulos 24 a 32 px |
| Espaçamento | Escala 4, 8, 12, 16, 24, 32 e 48 px; alinhamento consistente |
| Controles | Altura mínima de 44 px, foco visível e rótulo acessível |

Laranja da marca não deve ser usado automaticamente como fundo de texto branco pequeno: verificar contraste e usar texto escuro ou variação mais escura da cor para controles quando necessário. Cor nunca será a única indicação de estado.

## Navegação e telas

- Login e cadastro com hierarquia simples, rótulos persistentes, mensagens por campo e estado de envio.
- Área autenticada com navegação para Painel, Clientes e Coletas, identificação do usuário e saída.
- Painel como destino após autenticação. Seleção de período visível no cabeçalho.
- Listas com título, resumo, ação de cadastro, filtros e paginação. Clientes inativos e status de coleta identificados por texto e cor.
- Formulários com grupos coerentes, ações de salvar e voltar e preservação dos dados quando a API rejeitar o envio.
- Realização pede peso e data; CDF pede data; cancelamento e exclusão exigem confirmação com MTR ou cliente identificado.

Não incluir abas e módulos decorativos presentes nas imagens que não fazem parte do desafio.

## Composição do painel

1. Cabeçalho com título, contexto e mês inicial e final.
2. Quatro cartões alinhados: emitidos, com CDF, sem CDF e saldo com toneladas. Exibir média mensal, percentuais, barras e selo de atenção conforme o enunciado.
3. Receita e despesa por mês em área maior, com cartão escuro de atenção ao lado em telas largas.
4. Rastreabilidade e composição por resíduo em duas colunas.
5. Evolução mensal ocupando toda a largura, com seletor Toneladas, Receita e Despesa.

O cartão de atenção informa claramente “Situação atual · sem filtro de período”. Quando não houver pendências, exibir um estado positivo discreto. Para mais de cinco itens, mostrar o total e oferecer acesso à lista completa.

## Gráficos e números

- Barras de receita laranja e de despesa azul-escuro, com valores acima e legenda textual.
- Rastreabilidade empilhada em verde e salmão, por mês.
- Composição ordenada por toneladas, com barra proporcional, valor em toneladas e percentual.
- Eixos de barras partem de zero; unidade e mês estão explícitos. Não usar gráficos 3D nem efeitos que prejudiquem a leitura.
- Mostrar todos os meses do intervalo, inclusive os vazios. Adaptar frequência dos rótulos quando necessário.
- Formato brasileiro: `R$ 42.210,14`, `12,48 t`, `93%`. Abreviar somente rótulos compactos; manter valores completos nos detalhes.
- Disponibilizar descrição textual e alternativa acessível para os dados dos gráficos. Não depender exclusivamente de hover.
- Identificar a diferença entre data agendada dos MTR e data realizada dos movimentos financeiros, com ajuda contextual curta.

## Estados e acessibilidade

- Carregamento mantém a estrutura com skeleton ou indicador; uma atualização preserva a leitura sempre que possível.
- Vazio explica o estado e oferece próximo passo: criar registro ou limpar filtros. Falha da API oferece tentativa novamente.
- Ações em envio ficam desabilitadas para evitar repetição, sem substituir a proteção da API.
- Filtros ficam na URL para preservar navegação e compartilhamento dentro da aplicação. Alterar filtro reinicia a paginação.
- Token expirado conduz ao login, sem mostrar dados de sessão anterior. Erros de conexão não devem ser tratados automaticamente como expiração.
- Teclado alcança todas as ações. Diálogos gerenciam foco, permitem fechamento apropriado e devolvem foco à origem.
- Campos têm labels, erros associados e valores preservados. Toasts complementam as mensagens; não são o único canal para erro de formulário.
- Preferência por movimento reduzido respeitada. Testar contraste, zoom e largura estreita.

## Critério de revisão visual

Conferir as telas em 390, 768 e 1440 px, com dados vazios, poucos itens, muitos itens, nomes longos e erros. Cartões passam de quatro para duas e depois uma coluna; a navegação se adapta. Tabelas podem ter rolagem horizontal dentro de sua região, mantendo o restante da página estável. Nenhum conteúdo deve ficar cortado ou sobreposto.

## Três melhorias propostas para a referência

1. Tornar explícita a base temporal de cada bloco e a independência do cartão de atenção. Isso reduz interpretações incorretas de números que usam datas diferentes.
2. Apresentar pendências individuais com MTR, cliente e data, além da quantidade. Isso torna o painel útil para agir sobre o problema.
3. Oferecer descrição e alternativa tabular acessível para os gráficos, com estados vazios informativos. Isso amplia o acesso e permite conferir os números exatos.

As três melhorias estão implementadas no painel; evidências e limitações da revisão estão no README.

## Revisão das telas de acesso

Login e cadastro conferidos no Chrome em 390/393 px, 768 px e 1440 px. O formulário de cadastro permite rolar até as ações e o rodapé em telas estreitas. Foram conferidos estados de erro, foco no campo inválido, confirmação de senha, cadastro bem-sucedido, login, restauração e logout. Placeholders têm contraste mínimo de 4,5:1 sobre branco; bordas dos campos superam 3:1. As demais telas foram revisadas na etapa 7.

## Revisão da gestão de clientes

Listagem revisada no Chrome em desktop e 768 px, incluindo busca vazia, limpeza de filtros, situação, identificação de histórico e restrição de exclusão. Cadastro e edição conferidos com validação, máscara de CNPJ, foco no erro, salvamento e cancelamento de navegação mantendo os dados. A revisão móvel foi retomada e concluída na etapa 7. A tabela mantém colunas legíveis em uma região com rolagem horizontal; filtros e ações se reorganizam em larguras estreitas.

## Revisão de coletas e painel

Coletas conferidas no Chrome em desktop: listagem por situação, novo agendamento com cliente, peso/data obrigatórios na realização, mudança de situação e registro de CDF. Painel inspecionado em desktop com dados fictícios: quatro cartões, financeiro com valores compactos acima das barras, atenção atual, rastreabilidade empilhada, ranking, evolução e alternativa tabular. Troca de métrica mantém a posição da página. Revisão consolidada em 390/768/1440 px, teclado e estados de erro/vazio concluída na parte 7. Controles nativos de mês/data seguem a localização do navegador/sistema; rótulos e contexto do portal são em português.

## Revisão consolidada — 24/11/2026

Conferência manual no Chrome, por controles de emulação, em 390, 768 e 1440 px. Revisão de código orientada pelas [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). Sem sobreposição observada nos estados inspecionados; sem alegação de certificação de acessibilidade ou compatibilidade com navegadores não testados.

| Área | Evidência observada |
| --- | --- |
| Painel em 390 px | Cabeçalho, filtro, gráficos agrupados/empilhados, composição e evolução legíveis; troca de toneladas para receita sem salto de rolagem |
| Painel em 768/1440 px | Cartões em duas/quatro colunas, períodos alinhados, totais completos e gráfico financeiro sem sobreposição |
| Clientes em 390 px | Formulário em coluna única; envio vazio por teclado anuncia erros e foca nome; busca inexistente retorna vazio; seletor corrigido permanece legível com “Limpar filtros” |
| Coletas em 390/768/1440 px | Formulário em uma/duas colunas e guia lateral em desktop; campos de data/valores legíveis; filtros abrem pelo teclado |
| Diálogo de realização | Revisto em 390/1440 px com erro de peso e data; foco inicial em cancelar, erro no primeiro campo inválido, Escape devolve foco à ação original |
| Recuperação | API interrompida e reiniciada no Compose; tela própria de indisponibilidade, “Tentar novamente” recupera sessão e painel sem novo login |

### Achados corrigidos

- `apps/web/src/styles/clientes.css:106` — seletor de situação estreito com ação de limpeza no celular; agora ocupa uma linha.
- `apps/web/src/styles/clientes.css:85` — diálogos preparados para texto sem espaços e altura limitada, com rolagem contida.
- `apps/web/src/pages/ColetasPage.vue:71` — realização/CDF apresentam erro associado ao campo e foco no primeiro inválido.
- `apps/web/src/router/index.ts:34` — navegação entre páginas move o foco para o conteúdo sem afetar a troca de métrica.
- `apps/web/src/styles/global.css:28` — tabelas estreitas orientam a rolagem local por toque ou teclado.
- `apps/web/src/services/api.ts:19` — cancelamento de consultas preserva também o limite de 15 segundos de espera.
- `apps/api/src/coletas/coletas.service.ts:21` — MTR duplicado identifica o campo na resposta 409; mensagens de validação de coletas em português.

Os testes anteriores de cadastro, edição, realização e CDF continuam documentados nas etapas dos respectivos módulos. Esta rodada não alterou os registros fictícios existentes. Testes automatizados finais: lint sem avisos, tipos, 4 testes de configuração, 14 de lógica do front-end, 40 verificações PostgreSQL e build aprovados. API saudável e front-end respondendo após a simulação.
