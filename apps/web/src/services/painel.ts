import { apiRequest } from './api';

export interface PainelQuery { inicio: string; fim: string }
export interface SerieFinanceira { mes: string; receita: string; despesa: string; saldo: string }
export interface Painel {
  periodo: PainelQuery & { meses: number };
  indicadores: { emitidos: number; mediaMensalMtr: string; comCdf: number; semCdf: number; percentualComCdf: string; percentualSemCdf: string; receita: string; despesa: string; saldo: string; toneladas: string };
  financeiroMensal: SerieFinanceira[];
  rastreabilidadeMensal: { mes: string; comCdf: number; semCdf: number }[];
  composicaoResiduos: { tipoResiduo: string; toneladas: string; percentual: string }[];
  evolucaoMensal: { mes: string; toneladas: string; receita: string; despesa: string }[];
  atencao: { total: number; itens: { id: string; numeroMtr: string; cliente: { id: string; nome: string }; dataRealizada: string }[] };
}
export const monthIndex = (value: string) => Number(value.slice(0, 4)) * 12 + Number(value.slice(5)) - 1;
const monthString = (value: number) => `${String(Math.floor(value / 12)).padStart(4, '0')}-${String(value % 12 + 1).padStart(2, '0')}`;
export const validMonth = (value: unknown): value is string => typeof value === 'string' && /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(value);
export function defaultPeriodo(now = new Date()): PainelQuery {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(now);
  const fim = `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}`;
  return { inicio: monthString(monthIndex(fim) - 11), fim };
}
export function parsePainelQuery(query: Record<string, unknown>): PainelQuery {
  const defaults = defaultPeriodo();
  const fim = validMonth(query.fim) ? query.fim : defaults.fim;
  return { inicio: validMonth(query.inicio) ? query.inicio : monthString(monthIndex(fim) - 11), fim };
}
export function formatMonth(month: string, long = false): string {
  return new Intl.DateTimeFormat('pt-BR', { month: long ? 'long' : 'short', year: long ? 'numeric' : '2-digit', timeZone: 'UTC' }).format(new Date(`${month}-01T12:00:00Z`));
}
// Arredondamento somente na apresentação, sem converter o total financeiro para Number.
export function formatFixed(value: string, scale = 2): string {
  const negative = value.startsWith('-');
  const [integer, fraction = ''] = value.replace(/^-/, '').split('.');
  const factor = 10n ** BigInt(scale);
  let scaled = BigInt(integer) * factor + BigInt(fraction.padEnd(scale, '0').slice(0, scale) || '0');
  if (Number(fraction[scale] ?? '0') >= 5) scaled++;
  const whole = new Intl.NumberFormat('pt-BR').format(scaled / factor);
  return `${negative && scaled !== 0n ? '-' : ''}${whole}${scale ? `,${String(scaled % factor).padStart(scale, '0')}` : ''}`;
}
export const painelApi = { consultar: (query: PainelQuery, signal?: AbortSignal) => apiRequest<Painel>(`/painel?${new URLSearchParams({ ...query })}`, { signal }) };
