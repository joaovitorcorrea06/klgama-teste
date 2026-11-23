import type { Request } from 'express';
import type { Usuario } from '../usuarios/usuario.entity';

export const SESSION_COOKIE = 'ecocoleta_session';
export const JWT_ISSUER = 'ecocoleta-api';
export const JWT_AUDIENCE = 'ecocoleta-portal';

export interface AuthenticatedRequest extends Request {
  usuario: Usuario;
  expiraEm: number;
}
