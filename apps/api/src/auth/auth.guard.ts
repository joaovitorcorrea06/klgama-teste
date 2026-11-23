import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { isUUID } from 'class-validator';
import { readEnvironment } from '../config/environment';
import { UsuariosService } from '../usuarios/usuarios.service';
import { AuthenticatedRequest, SESSION_COOKIE } from './auth.types';
import { PUBLIC_ROUTE } from './public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly environment = readEnvironment();

  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService, private readonly usuarios: UsuariosService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    const origin = request.headers.origin;
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [context.getHandler(), context.getClass()]);
    if (isPublic) {
      if (unsafe && origin && origin !== this.environment.webOrigin) throw new ForbiddenException('Acesse esta ação pelo portal.');
      return true;
    }

    const authorization = request.headers.authorization;
    const bearer = authorization?.match(/^Bearer ([^\s]+)$/i)?.[1];
    const cookie: unknown = request.cookies?.[SESSION_COOKIE];
    const token = authorization ? bearer : (typeof cookie === 'string' ? cookie : undefined);
    if (!token) throw new UnauthorizedException('Entre na sua conta para continuar.');
    if (!authorization && unsafe && origin !== this.environment.webOrigin) {
      throw new ForbiddenException('Acesse esta ação pelo portal.');
    }

    let payload: { sub?: unknown; exp?: unknown };
    try {
      payload = await this.jwt.verifyAsync<{ sub?: unknown; exp?: unknown }>(token);
    } catch {
      throw new UnauthorizedException('Sua sessão expirou ou não é válida. Entre novamente.');
    }
    if (typeof payload.sub !== 'string' || !isUUID(payload.sub, '4') || typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
      throw new UnauthorizedException('Sua sessão não é válida. Entre novamente.');
    }
    const usuario = await this.usuarios.buscarPorId(payload.sub);
    if (!usuario) throw new UnauthorizedException('Sua sessão não é válida. Entre novamente.');
    request.usuario = usuario;
    request.expiraEm = payload.exp;
    return true;
  }
}
