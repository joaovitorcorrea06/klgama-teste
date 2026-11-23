# Regras e decisões de negócio

As exigências do desafio e as interpretações adotadas aparecem separadas abaixo. A API é a autoridade para todas as regras; a interface antecipa validações para orientar o usuário.

## Exigências do desafio

- Usuário tem nome, e-mail único, senha armazenada com hash e data de criação.
- Cliente tem nome, CNPJ único, cidade, UF, indicador de ativo e data de criação.
- Coleta pertence a um cliente e tem MTR único, tipo de resíduo, peso, receita, despesa, datas, status, observação e datas de auditoria técnica.
- Valores de receita e despesa são maiores ou iguais a zero.
- Coleta nasce agendada, sem peso e sem CDF.
- Somente Agendada → Realizada e Agendada → Cancelada são permitidas. Os dois destinos são finais.
- Realização exige peso maior que zero e data de realização.
- CDF exige coleta realizada e data igual ou posterior à realização.
- Cliente inativo não recebe nova coleta.
- Cliente com coleta não pode ser excluído; pode ser inativado.

## Decisões para implementação

### Campos e representação

- IDs serão UUID. Nomes públicos dos campos seguem o enunciado em português; status no contrato são `Agendada`, `Realizada` e `Cancelada`.
- Valores monetários usam `numeric(14,2)` e peso usa `numeric(14,3)` no PostgreSQL. Não usar ponto flutuante para cálculos financeiros. A API recebe e devolve decimais como strings canônicas, por exemplo `"1250.50"`; a interface aplica a máscara brasileira.
- Datas de negócio são datas civis `YYYY-MM-DD`, armazenadas como `date`. Datas de criação e atualização usam `timestamptz`, com saída ISO 8601 em UTC. Não converter datas civis em instantes no navegador.
- Receita e despesa têm padrão zero. Peso e datas de realização e CDF ficam nulos até suas ações específicas.
- E-mail é normalizado em minúsculas e sem espaços nas extremidades. CNPJ é normalizado para 14 dígitos. MTR é aparado e normalizado para maiúsculas antes da verificação de unicidade.
- A primeira versão valida formato e tamanho do CNPJ; cálculo dos dígitos verificadores é um diferencial. Todos os registros de demonstração devem ser inventados e identificados como fictícios.
- Tipo de resíduo é texto obrigatório, normalizado quanto a espaços. O formulário oferece sugestões dos tipos já cadastrados para evitar categorias acidentalmente diferentes.

### Integridade e concorrência

- Migrations criam chaves únicas para e-mail, CNPJ e MTR, FK de cliente com exclusão restrita e índice de `clienteId`.
- Checks protegem valores não negativos, peso positivo quando presente, campos compatíveis com o estado e ordem das datas do CDF. As transições entre estados são controladas pelo serviço.
- Alterar status usa atualização atômica condicionada ao estado anterior. Uma segunda ação simultânea recebe erro de conflito, sem sobrescrever a primeira.
- Criação ou troca de cliente de uma coleta coordena a verificação de cliente ativo com a persistência em transação. Exclusão e inativação de cliente devem respeitar a mesma estratégia de bloqueio, impedindo que uma corrida contorne a regra.
- Constraints são a proteção final contra duplicidade; erros conhecidos do banco são traduzidos para o contrato HTTP. Não retornar SQL nem mensagens internas ao usuário.
- Índices adicionais de datas, status e pendências serão definidos a partir das consultas efetivamente implementadas. Não criar um índice para cada campo indiscriminadamente.

### Atualização e exclusão

- Criação rejeita `status`, `pesoKg`, `dataRealizada` e `dataCdf` enviados pelo cliente. Não ignorar campos proibidos silenciosamente.
- PATCH comum de coleta altera somente cliente, MTR, resíduo, data agendada, valores e observação enquanto agendada. Em estados finais, somente observação poderá ser corrigida.
- Realização recebe peso e data em ação dedicada. Cancelamento não aceita peso ou CDF. Registrar CDF exige ação dedicada e permite corrigir sua data, mantendo as mesmas validações; não reabre nem desfaz a realização.
- Uma coleta agendada pode ser excluída após confirmação. Realizadas e canceladas são preservadas. Essa limitação de exclusão é uma decisão de rastreabilidade.
- Cliente inativo continua visível no histórico; impedir novas vinculações a ele não invalida coletas preexistentes.
- Todos os usuários pertencem à mesma operação fictícia. Não haverá acesso por perfis ou segregação de dados por usuário na primeira versão.

## Semântica dos indicadores

O enunciado não define a data de referência de cada indicador nem quando um MTR passa a contar como emitido. A interpretação adotada é que o MTR informado na criação já representa um documento emitido. Canceladas são excluídas dos indicadores; continuam consultáveis na gestão de coletas.

| Indicador | Base e cálculo | Data de referência |
| --- | --- | --- |
| MTR emitidos | Quantidade de agendadas e realizadas não canceladas | `dataAgendada` |
| Média mensal de MTR | Emitidos ÷ número de meses do intervalo, incluindo meses sem movimento | `dataAgendada` |
| MTR com CDF | Emitidos cuja `dataCdf` está preenchida; percentual sobre emitidos | `dataAgendada` |
| MTR sem CDF | Emitidos cuja `dataCdf` está nula; percentual sobre emitidos | `dataAgendada` |
| Receita, despesa e saldo | Somente realizadas; soma de receitas, soma de despesas e diferença | `dataRealizada` |
| Toneladas destinadas | Soma de peso das realizadas ÷ 1000 | `dataRealizada` |
| Receita e despesa mensais | Valores das realizadas agrupados por mês; saldo do período no cabeçalho | `dataRealizada` |
| Rastreabilidade mensal | Emitidos agrupados em com CDF e sem CDF | `dataAgendada` |
| Composição por resíduo | Peso das realizadas agrupado por tipo; ranking decrescente e percentual do peso total | `dataRealizada` |
| Evolução mensal | Realizadas agrupadas por mês; alternância entre toneladas, receita e despesa | `dataRealizada` |
| Precisa de atenção | Realizadas sem CDF de qualquer data, com quantidade total e lista paginada | Sem filtro de período |

Os gráficos e cartões indicarão a base temporal nos textos de ajuda. Uma coleta agendada pode ser um MTR sem CDF sem constituir pendência ambiental. O cartão de atenção representa apenas pendências de realizadas.

O painel representa a situação atual dos documentos associados ao período, e não um retrato histórico no último dia do período: um CDF recebido depois altera a rastreabilidade do MTR original.

### Períodos e limites

- Painel recebe meses `YYYY-MM`; início e fim inclusivos. Internamente, usar o primeiro dia do mês inicial e limite exclusivo no primeiro dia após o mês final.
- Padrão do painel: últimos 12 meses, incluindo o mês atual em `America/Sao_Paulo`. Limite inicial de 60 meses por consulta; valores inválidos ou invertidos retornam 400.
- Lista de coletas recebe datas `YYYY-MM-DD`, inclusivas, filtrando `dataAgendada`. Uma consulta separada por mês de realização só será necessária se o detalhamento financeiro for implementado.
- Meses sem movimento aparecem com zero; todas as séries mensais têm o mesmo eixo de meses.
- Percentuais com denominador zero são zero. Arredondar somente na apresentação; somas e saldos preservam a precisão decimal.
- Totais e séries vêm de agregações SQL. A API apenas monta o contrato e preenche meses sem movimento; o front-end não soma registros para construir o painel.

## Casos de referência para testes

Uma coleta agendada para janeiro e realizada em fevereiro conta como MTR de janeiro e movimento financeiro de fevereiro. Uma coleta cancelada não contribui para nenhum indicador. Uma agendada sem CDF entra em rastreabilidade, mas não em atenção. Uma realizada sem CDF fora do intervalo continua em atenção. Ao registrar seu CDF, ela sai de atenção mesmo que a data do documento seja posterior ao período consultado.
