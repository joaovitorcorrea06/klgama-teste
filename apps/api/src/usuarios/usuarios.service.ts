import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Usuario } from './usuario.entity';

@Injectable()
export class UsuariosService {
  constructor(@InjectRepository(Usuario) private readonly repository: Repository<Usuario>) {}

  buscarPorId(id: string): Promise<Usuario | null> {
    return this.repository.findOneBy({ id });
  }

  buscarParaLogin(email: string): Promise<Usuario | null> {
    return this.repository.createQueryBuilder('usuario').addSelect('usuario.senhaHash')
      .where('usuario.email = :email', { email }).getOne();
  }

  async criar(nome: string, email: string, senhaHash: string): Promise<Usuario> {
    try {
      return await this.repository.save(this.repository.create({ nome, email, senhaHash }));
    } catch (error: unknown) {
      if (error instanceof QueryFailedError && error.driverError.code === '23505' && error.driverError.constraint === 'usuarios_email_key') {
        throw new ConflictException('Este e-mail já está cadastrado. Entre na sua conta ou use outro e-mail.');
      }
      throw error;
    }
  }
}
