import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'text' }) nome!: string;
  @Column({ type: 'text', unique: true }) email!: string;
  @Column({ name: 'senha_hash', type: 'text', select: false }) senhaHash!: string;
  @CreateDateColumn({ name: 'criado_em', type: 'timestamptz' }) criadoEm!: Date;
}

export function usuarioPublico(usuario: Usuario) {
  return { id: usuario.id, nome: usuario.nome, email: usuario.email, criadoEm: usuario.criadoEm.toISOString() };
}
