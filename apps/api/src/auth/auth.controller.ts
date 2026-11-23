import { Body, Controller, Get, Header, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { CookieOptions, Response } from 'express';
import { readEnvironment } from '../config/environment';
import { usuarioPublico } from '../usuarios/usuario.entity';
import { CadastroDto, LoginDto } from './auth.dto';
import { AuthService } from './auth.service';
import { AuthenticatedRequest, SESSION_COOKIE } from './auth.types';
import { Public } from './public.decorator';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private cookieOptions(): CookieOptions {
    return { httpOnly: true, secure: readEnvironment().auth.cookieSecure, sameSite: 'strict', path: '/' };
  }

  @Public()
  @Post('cadastro')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  cadastrar(@Body() dto: CadastroDto) { return this.auth.cadastrar(dto); }

  @Public()
  @Post('login')
  @Header('Cache-Control', 'no-store')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async entrar(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.entrar(dto);
    response.cookie(SESSION_COOKIE, session.accessToken, { ...this.cookieOptions(), maxAge: session.expiresIn * 1000 });
    return session;
  }

  @Get('me')
  @Header('Cache-Control', 'no-store')
  me(@Req() request: AuthenticatedRequest) {
    return { usuario: usuarioPublico(request.usuario), expiraEm: new Date(request.expiraEm * 1000).toISOString() };
  }

  @Post('logout')
  @Header('Cache-Control', 'no-store')
  @HttpCode(204)
  sair(@Res({ passthrough: true }) response: Response): void {
    response.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }
}
