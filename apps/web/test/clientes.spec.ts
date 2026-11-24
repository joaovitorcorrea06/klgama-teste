import { describe, expect, it, vi } from 'vitest';
import { clientesApi, clientesRouteQuery, formatCnpj, parseClientesQuery } from '../src/services/clientes';

describe('filtros e apresentação de clientes', () => {
  it('preserva filtros na URL e envia os filtros específicos na consulta à API', async () => {
    const parsed = parseClientesQuery({ ativo: 'false', busca: '  Horizonte ', pagina: '2', limite: '10' });
    expect(parsed).toEqual({ ativo: 'false', busca: 'Horizonte', pagina: 2, limite: 10 });
    expect(clientesRouteQuery(parsed)).toEqual({ ativo: 'false', busca: 'Horizonte', pagina: '2', limite: '10' });
    expect(parseClientesQuery({ pagina: '-1', limite: '1000', ativo: '0', busca: ['a', 'b'] })).toEqual({ busca: '', ativo: '', pagina: 1, limite: 20 });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ itens: [], meta: { total: 0 } }), { status: 200 }));
    await clientesApi.listar({ ...parsed, busca: '', nome: ' Aurora ', cnpj: '00.000.000/0000-01', cidade: ' Cidade Exemplo ' });
    const url = new URL(String(fetchMock.mock.calls[0][0]), 'http://localhost');
    expect(Object.fromEntries(url.searchParams)).toEqual({ pagina: '2', limite: '10', ativo: 'false', nome: 'Aurora', cnpj: '00.000.000/0000-01', cidade: 'Cidade Exemplo' });
  });
  it('máscara aceita colagem e mantém os 14 dígitos do CNPJ fictício', () => {
    expect(formatCnpj('00000000000001')).toBe('00.000.000/0000-01');
    expect(formatCnpj('00.000.000/0000-01')).toBe('00.000.000/0000-01');
    expect(formatCnpj('123')).toBe('12.3');
  });
});
