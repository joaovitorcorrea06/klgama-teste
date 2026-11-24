import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Cliente } from '../clientes/cliente.entity';

export type StatusColeta = 'Agendada' | 'Realizada' | 'Cancelada';

@Entity('coletas')
export class Coleta {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'cliente_id', type: 'uuid' }) clienteId!: string;
  @ManyToOne(() => Cliente, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cliente_id' }) cliente!: Cliente;
  @Column({ name: 'numero_mtr', type: 'text', unique: true }) numeroMtr!: string;
  @Column({ name: 'tipo_residuo', type: 'text' }) tipoResiduo!: string;
  @Column({ name: 'peso_kg', type: 'numeric', precision: 14, scale: 3, nullable: true }) pesoKg!: string | null;
  @Column({ name: 'valor_receita', type: 'numeric', precision: 14, scale: 2, default: 0 }) valorReceita!: string;
  @Column({ name: 'valor_despesa', type: 'numeric', precision: 14, scale: 2, default: 0 }) valorDespesa!: string;
  @Column({ name: 'data_agendada', type: 'date' }) dataAgendada!: string;
  @Column({ name: 'data_realizada', type: 'date', nullable: true }) dataRealizada!: string | null;
  @Column({ name: 'data_cdf', type: 'date', nullable: true }) dataCdf!: string | null;
  @Column({ type: 'text', default: 'Agendada' }) status!: StatusColeta;
  @Column({ type: 'text', nullable: true }) observacao!: string | null;
  @CreateDateColumn({ name: 'criado_em', type: 'timestamptz' }) criadoEm!: Date;
  @UpdateDateColumn({ name: 'atualizado_em', type: 'timestamptz' }) atualizadoEm!: Date;
}
