import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
