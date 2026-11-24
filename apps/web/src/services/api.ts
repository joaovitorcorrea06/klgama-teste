export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly errors: Record<string, string[]> = {}) {
    super(message);
    this.name = 'ApiError';
  }
}

let unauthorizedHandler: (() => void) | undefined;
export function onUnauthorized(handler: () => void): void { unauthorizedHandler = handler; }
const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export async function apiRequest<T>(path: string, options: RequestInit = {}, notifyUnauthorized = true): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      credentials: 'same-origin',
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
      signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao portal. Confira sua conexão e tente novamente.');
  }
  if (!response.ok) {
    if (response.status === 401 && notifyUnauthorized) unauthorizedHandler?.();
    const body = await response.json().catch(() => ({})) as { message?: string; errors?: Record<string, string[]> };
    throw new ApiError(response.status, body.message || 'Não foi possível concluir a operação. Tente novamente.', body.errors);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}
