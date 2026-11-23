import { apiRequest } from './api';

export interface Cliente {
  id: string; nome: string; cnpj: string; cidade: string; uf: string;
  ativo: boolean; criadoEm: string; possuiColetas?: boolean;
}
export interface ClienteInput { nome: string; cnpj: string; cidade: string; uf: string; ativo: boolean }
export interface ClientesQuery { busca: string; ativo: '' | 'true' | 'false'; pagina: number; limite: number }
export interface ClientesResult { itens: Cliente[]; meta: { pagina: number; limite: number; total: number; totalPaginas: number } }
export const ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export function formatCnpj(value: string): string {
  return value.replace(/\D/g, '').slice(0, 14).replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
}

export function parseClientesQuery(query: Record<string, unknown>): ClientesQuery {
  const positive = (value: unknown, fallback: number, max: number) => typeof value === 'string' && /^[1-9]\d*$/.test(value) && Number(value) <= max ? Number(value) : fallback;
  const limite = positive(query.limite, 20, 100);
  return {
    busca: typeof query.busca === 'string' ? query.busca.trim().slice(0, 150) : '',
    ativo: query.ativo === 'true' || query.ativo === 'false' ? query.ativo : '',
    pagina: positive(query.pagina, 1, 100000),
    limite: [10, 20, 50].includes(limite) ? limite : 20,
  };
}

export function clientesRouteQuery(query: ClientesQuery): Record<string, string> {
  return { ...(query.busca ? { busca: query.busca } : {}), ...(query.ativo ? { ativo: query.ativo } : {}),
    ...(query.pagina > 1 ? { pagina: String(query.pagina) } : {}), ...(query.limite !== 20 ? { limite: String(query.limite) } : {}) };
}

export const clientesApi = {
  listar(query: ClientesQuery, signal?: AbortSignal) {
    const parameters = new URLSearchParams({ pagina: String(query.pagina), limite: String(query.limite), ...(query.busca ? { busca: query.busca } : {}), ...(query.ativo ? { ativo: query.ativo } : {}) });
    return apiRequest<ClientesResult>(`/clientes?${parameters}`, { signal });
  },
  buscar: (id: string) => apiRequest<Cliente>(`/clientes/${encodeURIComponent(id)}`),
  criar: (data: ClienteInput) => apiRequest<Cliente>('/clientes', { method: 'POST', body: JSON.stringify(data) }),
  atualizar: (id: string, data: Partial<ClienteInput>) => apiRequest<Cliente>(`/clientes/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  excluir: (id: string) => apiRequest<void>(`/clientes/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
