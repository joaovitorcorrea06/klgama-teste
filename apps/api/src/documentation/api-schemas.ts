import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

const text: SchemaObject = { type: 'string' };
const uuid: SchemaObject = { type: 'string', format: 'uuid' };
const date: SchemaObject = { type: 'string', format: 'date', example: '2026-11-24' };
const timestamp: SchemaObject = { type: 'string', format: 'date-time' };
const integer: SchemaObject = { type: 'integer', minimum: 0 };
const decimal: SchemaObject = { type: 'string', pattern: '^-?\\d+(\\.\\d+)?$', description: 'Decimal exato como texto, com ponto e sem agrupamento.', example: '1250.50' };
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const array = (items: SchemaObject | ReturnType<typeof ref>): SchemaObject => ({ type: 'array', items });
const object = (properties: Record<string, SchemaObject | ReturnType<typeof ref>>, optional: string[] = []): SchemaObject => ({ type: 'object', properties, required: Object.keys(properties).filter(key => !optional.includes(key)) });
const meta = object({ pagina: { type: 'integer', minimum: 1 }, limite: { type: 'integer', minimum: 1, maximum: 100 }, total: integer, totalPaginas: integer });
const page = (model: string) => object({ itens: array(ref(model)), meta });

export const API_SCHEMAS: Record<string, SchemaObject> = {
  UsuarioPublico: object({ id: uuid, nome: text, email: { type: 'string', format: 'email' }, criadoEm: timestamp }),
  SessaoLogin: object({ accessToken: text, tokenType: { type: 'string', enum: ['Bearer'] }, expiresIn: { type: 'integer', description: 'Validade em segundos.' }, usuario: ref('UsuarioPublico') }),
  SessaoAtual: object({ usuario: ref('UsuarioPublico'), expiraEm: timestamp }),
  ClientePublico: object({ id: uuid, nome: text, cnpj: { type: 'string', pattern: '^\\d{14}$', example: '00000000000001' }, cidade: text, uf: text, ativo: { type: 'boolean' }, criadoEm: timestamp, possuiColetas: { type: 'boolean' } }, ['possuiColetas']),
  ColetaPublica: object({ id: uuid, clienteId: uuid, cliente: ref('ClientePublico'), numeroMtr: text, tipoResiduo: text, pesoKg: { ...decimal, nullable: true }, valorReceita: decimal, valorDespesa: decimal, dataAgendada: date, dataRealizada: { ...date, nullable: true }, dataCdf: { ...date, nullable: true }, status: { type: 'string', enum: ['Agendada', 'Realizada', 'Cancelada'] }, observacao: { ...text, nullable: true }, criadoEm: timestamp, atualizadoEm: timestamp }),
  ClientesPaginados: page('ClientePublico'),
  ColetasPaginadas: page('ColetaPublica'),
  SugestoesResiduos: object({ itens: array(text), limite: { type: 'integer', enum: [20] } }),
  Painel: object({
    periodo: object({ inicio: { type: 'string', example: '2025-12' }, fim: { type: 'string', example: '2026-11' }, meses: { type: 'integer', minimum: 1, maximum: 60 } }),
    indicadores: object({ emitidos: integer, mediaMensalMtr: decimal, comCdf: integer, semCdf: integer, percentualComCdf: decimal, percentualSemCdf: decimal, receita: decimal, despesa: decimal, saldo: decimal, toneladas: decimal }),
    financeiroMensal: array(object({ mes: text, receita: decimal, despesa: decimal, saldo: decimal })),
    rastreabilidadeMensal: array(object({ mes: text, comCdf: integer, semCdf: integer })),
    composicaoResiduos: array(object({ tipoResiduo: text, toneladas: decimal, percentual: decimal })),
    evolucaoMensal: array(object({ mes: text, toneladas: decimal, receita: decimal, despesa: decimal })),
    atencao: object({ total: integer, itens: { ...array(object({ id: uuid, numeroMtr: text, cliente: object({ id: uuid, nome: text }), dataRealizada: date })), maxItems: 5 } }),
  }),
  Erro: object({ statusCode: { type: 'integer' }, code: text, message: text, errors: { type: 'object', additionalProperties: array(text) } }, ['errors']),
};
