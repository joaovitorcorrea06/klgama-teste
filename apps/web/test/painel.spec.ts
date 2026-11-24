import { describe, expect, it } from 'vitest';
import { defaultPeriodo, formatFixed, parsePainelQuery } from '../src/services/painel';

describe('período e apresentação exata do painel', () => {
  it('arredonda apenas na apresentação, inclusive valores altos e saldo negativo', () => {
    expect(formatFixed('123456789012345678.995')).toBe('123.456.789.012.345.679,00');
    expect(formatFixed('-10.005')).toBe('-10,01');
    expect(formatFixed('-0.001')).toBe('0,00');
    expect(formatFixed('1.000875', 3)).toBe('1,001');
    expect(formatFixed('33.33333333333333333', 1)).toBe('33,3');
  });
  it('usa o mês de São Paulo e inclui doze meses', () => {
    expect(defaultPeriodo(new Date('2026-03-01T01:00:00Z'))).toEqual({ inicio: '2025-03', fim: '2026-02' });
    expect(parsePainelQuery({ fim: '2020-12' })).toEqual({ inicio: '2020-01', fim: '2020-12' });
  });
});
