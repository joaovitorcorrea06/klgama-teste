import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'text' }) nome!: string;
  @Column({ type: 'text', unique: true }) cnpj!: string;
  @Column({ type: 'text' }) cidade!: string;
  @Column({ type: 'text' }) uf!: string;
  @Column({ type: 'boolean', default: true }) ativo!: boolean;
  @CreateDateColumn({ name: 'criado_em', type: 'timestamptz' }) criadoEm!: Date;
}
