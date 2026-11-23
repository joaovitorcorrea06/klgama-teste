import { reactive, readonly } from 'vue';
import { ApiError, apiRequest, onUnauthorized } from '../services/api';

interface Usuario { id: string; nome: string; email: string; criadoEm: string }
interface SessionResponse { usuario: Usuario; expiraEm: string }
interface LoginResponse { usuario: Usuario; expiresIn: number }
const state = reactive({ usuario: null as Usuario | null, status: 'unknown' as 'unknown' | 'authenticated' | 'anonymous' | 'unavailable', error: '' });
let initialization: Promise<void> | undefined;
let expirationTimer: ReturnType<typeof setTimeout> | undefined;
let expiration = 0;
let revision = 0;
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ecocoleta-session') : undefined;
export const registrationNotice = reactive({ email: '' });

function clearSession(): void {
  revision++;
  clearTimeout(expirationTimer);
  expiration = 0;
  state.usuario = null;
  state.status = 'anonymous';
  state.error = '';
}
function setSession(usuario: Usuario, expiresAt: number): void {
  revision++;
  clearTimeout(expirationTimer);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) { clearSession(); return; }
  state.usuario = usuario;
  state.status = 'authenticated';
  state.error = '';
  expiration = expiresAt;
  expirationTimer = setTimeout(clearSession, Math.max(0, expiresAt - Date.now()));
}
export async function restoreSession(): Promise<void> {
  const current = ++revision;
  try {
    const result = await apiRequest<SessionResponse>('/auth/me', {}, false);
    if (current === revision) setSession(result.usuario, Date.parse(result.expiraEm));
  } catch (error) {
    if (current !== revision) return;
    if (error instanceof ApiError && error.status === 401) clearSession();
    else {
      state.usuario = null;
      state.status = 'unavailable';
      state.error = error instanceof Error ? error.message : 'Não foi possível verificar sua sessão.';
    }
  }
}
export async function ensureSession(): Promise<void> {
  if (state.status !== 'unknown') return;
  initialization ??= restoreSession();
  await initialization;
}
export async function login(email: string, senha: string): Promise<void> {
  const result = await apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) }, false);
  setSession(result.usuario, Date.now() + result.expiresIn * 1000);
  channel?.postMessage('changed');
}
export async function logout(): Promise<void> {
  try { await apiRequest<void>('/auth/logout', { method: 'POST' }, false); }
  catch (error) { if (!(error instanceof ApiError) || error.status !== 401) throw error; }
  clearSession();
  channel?.postMessage('logout');
}
onUnauthorized(clearSession);
channel?.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (event.data === 'logout') clearSession();
  if (event.data === 'changed') void restoreSession();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && expiration && Date.now() >= expiration) clearSession();
});
export const session = readonly(state);
