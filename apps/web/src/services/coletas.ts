import { apiRequest } from './api';
import type { Cliente } from './clientes';

export type StatusColeta = 'Agendada' | 'Realizada' | 'Cancelada';
export interface ColetaInput { clienteId: string; numeroMtr: string; tipoResiduo: string; dataAgendada: string; valorReceita: string; valorDespesa: string; observacao: string }
export interface Coleta extends ColetaInput { id: string; cliente: Cliente; status: StatusColeta; pesoKg: string | null; dataRealizada: string | null; dataCdf: string | null; criadoEm: string; atualizadoEm: string }
export interface ColetasQuery { clienteId: string; status: '' | StatusColeta; tipoResiduo: string; inicio: string; fim: string; semCdf: '' | 'true' | 'false'; pagina: number; limite: number }
export interface ColetasResult { itens: Coleta[]; meta: { pagina: number; limite: number; total: number; totalPaginas: number } }
export const statuses: StatusColeta[] = ['Agendada', 'Realizada', 'Cancelada'];
export function validDate(value: string): boolean {
  if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
// Inputs brasileiros aceitam vírgula ou ponto; o contrato da API usa somente ponto, sem agrupamento.
export function decimalInput(value: string, scale: number, integers: number, positive = false): string | null {
  const normalized = value.trim().replace(',', '.');
  if (!new RegExp(`^(0|[1-9]\\d{0,${integers - 1}})(\\.\\d{1,${scale}})?$`).test(normalized)) return null;
  if (positive && !/[1-9]/.test(normalized)) return null;
  return normalized;
}
export function formatDate(value: string | null): string { return value ? value.split('-').reverse().join('/') : '—'; }
export function formatDecimal(value: string, scale = 2): string {
  const [integer, fraction = ''] = value.split('.');
  return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${fraction.padEnd(scale, '0').slice(0, scale)}`;
}
export function parseColetasQuery(query: Record<string, unknown>): ColetasQuery {
  const positive = (value: unknown, fallback: number, max: number) => typeof value === 'string' && /^[1-9]\d*$/.test(value) && Number(value) <= max ? Number(value) : fallback;
  const string = (key: string, max = 160) => typeof query[key] === 'string' ? (query[key] as string).trim().slice(0, max) : '';
  const date = (key: string) => validDate(string(key)) ? string(key) : '';
  const limit = positive(query.limite, 20, 100);
  return { clienteId: /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(string('clienteId')) ? string('clienteId') : '', status: statuses.includes(query.status as StatusColeta) ? query.status as StatusColeta : '', tipoResiduo: string('tipoResiduo').replace(/\s+/g, ' '), inicio: date('inicio'), fim: date('fim'), semCdf: query.semCdf === 'true' || query.semCdf === 'false' ? query.semCdf : '', pagina: positive(query.pagina, 1, 100000), limite: [10, 20, 50].includes(limit) ? limit : 20 };
}
export function coletasRouteQuery(query: ColetasQuery): Record<string, string> {
  return Object.fromEntries(Object.entries(query).filter(([key, value]) => value !== '' && !(key === 'pagina' && value === 1) && !(key === 'limite' && value === 20)).map(([key, value]) => [key, String(value)]));
}
export const coletasApi = {
  listar: (query: ColetasQuery, signal?: AbortSignal) => apiRequest<ColetasResult>(`/coletas?${new URLSearchParams(coletasRouteQuery(query))}`, { signal }),
  buscar: (id: string) => apiRequest<Coleta>(`/coletas/${encodeURIComponent(id)}`),
  criar: (data: ColetaInput) => apiRequest<Coleta>('/coletas', { method: 'POST', body: JSON.stringify(data) }),
  atualizar: (id: string, data: Partial<ColetaInput>) => apiRequest<Coleta>(`/coletas/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  realizar: (id: string, data: { pesoKg: string; dataRealizada: string }) => apiRequest<Coleta>(`/coletas/${encodeURIComponent(id)}/realizar`, { method: 'PATCH', body: JSON.stringify(data) }),
  cancelar: (id: string) => apiRequest<Coleta>(`/coletas/${encodeURIComponent(id)}/cancelar`, { method: 'PATCH', body: '{}' }),
  cdf: (id: string, dataCdf: string) => apiRequest<Coleta>(`/coletas/${encodeURIComponent(id)}/cdf`, { method: 'PATCH', body: JSON.stringify({ dataCdf }) }),
  excluir: (id: string) => apiRequest<void>(`/coletas/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  residuos: (busca: string, signal?: AbortSignal) => apiRequest<{ itens: string[]; limite: number }>(`/coletas/residuos?${new URLSearchParams({ busca })}`, { signal }),
};
