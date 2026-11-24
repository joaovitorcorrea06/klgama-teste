import { describe, expect, it } from 'vitest';
import { coletasRouteQuery, decimalInput, formatDate, formatDecimal, parseColetasQuery, validDate } from '../src/services/coletas';

describe('entrada e apresentação de coletas', () => {
  it('converte entrada brasileira sem arredondar e rejeita agrupamento ambíguo', () => {
    expect(decimalInput('123456789012,34', 2, 12)).toBe('123456789012.34');
    expect(decimalInput('0,001', 3, 11, true)).toBe('0.001');
    for (const value of ['1.000,00', '-1', '1e3', 'NaN', '0.001', '1000000000000']) expect(decimalInput(value, 2, 12)).toBeNull();
    expect(decimalInput('0,000', 3, 11, true)).toBeNull();
    expect(formatDecimal('123456789012.34')).toBe('123.456.789.012,34');
    expect(formatDecimal('0.001', 3)).toBe('0,001');
  });
  it('mantém datas civis sem deslocamento de fuso e recusa dias impossíveis', () => {
    expect(validDate('2024-02-29')).toBe(true);
    for (const value of ['2026-02-29', '2026-04-31', '2026-11-23T00:00:00Z', '0026-01-01']) expect(validDate(value)).toBe(false);
    expect(formatDate('2026-11-23')).toBe('23/11/2026');
  });
  it('preserva filtros explícitos de CDF e de pendência na URL', () => {
    const query = parseColetasQuery({ status: 'Realizada', semCdf: 'true', pagina: '2', inicio: '2026-11-01' });
    expect(coletasRouteQuery(query)).toEqual({ status: 'Realizada', semCdf: 'true', pagina: '2', inicio: '2026-11-01' });
    expect(coletasRouteQuery(parseColetasQuery({ semCdf: 'false' }))).toEqual({ semCdf: 'false' });
    expect(parseColetasQuery({ clienteId: 'abc', inicio: '2026-02-30', limite: '1000', status: ['Agendada'] })).toEqual(parseColetasQuery({}));
  });
});
