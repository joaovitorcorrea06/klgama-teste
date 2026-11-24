import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { isUUID } from 'class-validator';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { readEnvironment } from '../config/environment';
import { usuarioPublico } from '../usuarios/usuario.entity';
import { UsuariosService } from '../usuarios/usuarios.service';
import { CadastroDto, LoginDto } from './auth.dto';

@Injectable()
export class AuthService {
  private readonly dummyHash = hash(randomUUID(), 12);

  constructor(private readonly usuarios: UsuariosService, private readonly jwt: JwtService) {}

  async validarToken(token: string) {
    let payload: { sub?: unknown; exp?: unknown };
    try { payload = await this.jwt.verifyAsync<{ sub?: unknown; exp?: unknown }>(token); }
    catch { throw new UnauthorizedException('Sua sessão expirou ou não é válida. Entre novamente.'); }
    if (typeof payload.sub !== 'string' || !isUUID(payload.sub, '4') || typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
      throw new UnauthorizedException('Sua sessão não é válida. Entre novamente.');
    }
    const usuario = await this.usuarios.buscarPorId(payload.sub);
    if (!usuario) throw new UnauthorizedException('Sua sessão não é válida. Entre novamente.');
    return { usuario, expiraEm: payload.exp };
  }

  async cadastrar(dto: CadastroDto) {
    const senhaHash = await hash(dto.senha, 12);
    return usuarioPublico(await this.usuarios.criar(dto.nome, dto.email, senhaHash));
  }

  async entrar(dto: LoginDto) {
    const usuario = await this.usuarios.buscarParaLogin(dto.email);
    const matches = await compare(dto.senha, usuario?.senhaHash ?? await this.dummyHash);
    if (!usuario || !matches) throw new UnauthorizedException('E-mail ou senha incorretos. Confira os dados e tente novamente.');
    const accessToken = await this.jwt.signAsync({ sub: usuario.id });
    return { accessToken, tokenType: 'Bearer' as const, expiresIn: readEnvironment().auth.expiresIn, usuario: usuarioPublico(usuario) };
  }
}
