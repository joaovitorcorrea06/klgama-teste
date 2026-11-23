import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import 'vue';

const usuario = { id: 'usuario-ficticio', nome: 'Pessoa Fictícia', email: 'pessoa@example.test', criadoEm: '2026-01-01T00:00:00.000Z' };
const fetchMock = vi.fn<typeof fetch>();

function result(body: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-23T18:00:00Z'));
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }));
  vi.stubGlobal('BroadcastChannel', class extends EventTarget { postMessage() {} });
});

afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('sessão do portal', () => {
  it('restaura uma sessão existente pelo cookie sem armazenar o token em JavaScript', async () => {
    fetchMock.mockResolvedValue(result({ usuario, expiraEm: '2026-11-23T19:00:00Z' }));
    const { ensureSession, session } = await import('../src/composables/useSession');
    await Promise.all([ensureSession(), ensureSession()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.credentials).toBe('same-origin');
    expect(session.status).toBe('authenticated');
    expect(session.usuario?.nome).toBe(usuario.nome);
    expect('accessToken' in session).toBe(false);
  });

  it('diferencia sessão inválida de falha de conexão', async () => {
    fetchMock.mockResolvedValueOnce(result({ message: 'Sessão inválida.' }, 401));
    const { restoreSession, session } = await import('../src/composables/useSession');
    await restoreSession();
    expect(session.status).toBe('anonymous');
    fetchMock.mockRejectedValueOnce(new TypeError('network'));
    await restoreSession();
    expect(session.status).toBe('unavailable');
    expect(session.error).toContain('conectar');
  });

  it('encerra automaticamente quando a duração do login termina', async () => {
    fetchMock.mockResolvedValue(result({ usuario, expiresIn: 60 }));
    const { login, session } = await import('../src/composables/useSession');
    await login(usuario.email, 'Senha fictícia');
    expect(session.status).toBe('authenticated');
    await vi.advanceTimersByTimeAsync(60001);
    expect(session.status).toBe('anonymous');
    expect(session.usuario).toBeNull();
  });

  it('não aceita restauração que já chega expirada', async () => {
    fetchMock.mockResolvedValue(result({ usuario, expiraEm: '2026-11-23T17:59:00Z' }));
    const { restoreSession, session } = await import('../src/composables/useSession');
    await restoreSession();
    expect(session.status).toBe('anonymous');
  });

  it('preserva a sessão quando a saída falha e limpa após confirmação da API', async () => {
    fetchMock.mockResolvedValueOnce(result({ usuario, expiresIn: 3600 }));
    const { login, logout, session } = await import('../src/composables/useSession');
    await login(usuario.email, 'Senha fictícia');
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    await expect(logout()).rejects.toThrow('conectar');
    expect(session.status).toBe('authenticated');
    fetchMock.mockResolvedValueOnce(result(null, 204));
    await logout();
    expect(session.status).toBe('anonymous');
    expect(session.usuario).toBeNull();
  });

  it('limpa a sessão quando uma rota protegida retorna 401', async () => {
    fetchMock.mockResolvedValueOnce(result({ usuario, expiresIn: 3600 }));
    const { login, session } = await import('../src/composables/useSession');
    const { apiRequest } = await import('../src/services/api');
    await login(usuario.email, 'Senha fictícia');
    fetchMock.mockResolvedValueOnce(result({ message: 'Sessão expirada.' }, 401));
    await expect(apiRequest('/recurso-protegido')).rejects.toThrow('Sessão expirada.');
    expect(session.status).toBe('anonymous');
  });

  it('uma restauração atrasada não substitui um login mais recente', async () => {
    let resolveRestore!: (value: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveRestore = resolve; }));
    const { restoreSession, login, session } = await import('../src/composables/useSession');
    const restoring = restoreSession();
    fetchMock.mockResolvedValueOnce(result({ usuario, expiresIn: 3600 }));
    await login(usuario.email, 'Senha fictícia');
    resolveRestore(result({ message: 'Sessão antiga.' }, 401));
    await restoring;
    expect(session.status).toBe('authenticated');
  });
});
