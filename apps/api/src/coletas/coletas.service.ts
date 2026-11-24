import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import { Cliente } from '../clientes/cliente.entity';
import { Coleta } from './coleta.entity';
import { AtualizarColetaDto, CriarColetaDto, ListarColetasDto, RealizarColetaDto, RegistrarCdfDto } from './coletas.dto';

@Injectable()
export class ColetasService {
  constructor(@InjectRepository(Coleta) private readonly repository: Repository<Coleta>) {}

  async residuos(busca = '') {
    const itens = await this.repository.createQueryBuilder('coleta').select('coleta.tipoResiduo', 'tipo')
      .distinct(true).where('coleta.tipoResiduo ILIKE :busca', { busca: `%${busca.replace(/[\\%_]/g, '\\$&')}%` })
      .orderBy('coleta.tipoResiduo', 'ASC').limit(20).getRawMany<{ tipo: string }>();
    return { itens: itens.map((item) => item.tipo), limite: 20 };
  }

  private rethrow(error: unknown): never {
    if (error instanceof QueryFailedError && error.driverError.code === '23505' && error.driverError.constraint === 'coletas_numero_mtr_key') {
      throw new ConflictException({ message: 'Este número de MTR já está cadastrado.', errors: { numeroMtr: ['Este número de MTR já está cadastrado.'] } });
    }
    throw error;
  }

  async listar(dto: ListarColetasDto) {
    if (dto.inicio && dto.fim && dto.inicio > dto.fim) throw new BadRequestException('A data inicial deve ser anterior ou igual à final.');
    const query = this.repository.createQueryBuilder('coleta').innerJoinAndSelect('coleta.cliente', 'cliente');
    if (dto.clienteId) query.andWhere('coleta.clienteId = :clienteId', { clienteId: dto.clienteId });
    if (dto.status) query.andWhere('coleta.status = :status', { status: dto.status });
    if (dto.tipoResiduo) query.andWhere('coleta.tipoResiduo = :tipoResiduo', { tipoResiduo: dto.tipoResiduo });
    if (dto.inicio) query.andWhere('coleta.dataAgendada >= :inicio', { inicio: dto.inicio });
    if (dto.fim) query.andWhere('coleta.dataAgendada <= :fim', { fim: dto.fim });
    if (dto.semCdf !== undefined) query.andWhere(`coleta.dataCdf IS ${dto.semCdf ? '' : 'NOT '}NULL`);
    const [itens, total] = await query.orderBy('coleta.dataAgendada', 'DESC').addOrderBy('coleta.id', 'ASC')
      .skip((dto.pagina - 1) * dto.limite).take(dto.limite).getManyAndCount();
    return { itens, meta: { pagina: dto.pagina, limite: dto.limite, total, totalPaginas: Math.ceil(total / dto.limite) } };
  }

  async buscar(id: string) {
    const coleta = await this.repository.findOne({ where: { id }, relations: { cliente: true } });
    if (!coleta) throw new NotFoundException('Coleta não encontrada.');
    return coleta;
  }

  // O mesmo bloqueio de clientes usado na inativação/exclusão fecha a janela entre checar e vincular.
  private async clienteAtivo(manager: EntityManager, id: string): Promise<void> {
    const cliente = await manager.getRepository(Cliente).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
    if (!cliente) throw new NotFoundException('Cliente não encontrado.');
    if (!cliente.ativo) throw new BadRequestException('O cliente está inativo. Selecione um cliente ativo.');
  }

  async criar(dto: CriarColetaDto) {
    try {
      const id = await this.repository.manager.transaction(async (manager) => {
        await this.clienteAtivo(manager, dto.clienteId);
        const repository = manager.getRepository(Coleta);
        const coleta = await repository.save(repository.create({ ...dto, status: 'Agendada', valorReceita: dto.valorReceita ?? '0', valorDespesa: dto.valorDespesa ?? '0' }));
        return coleta.id;
      });
      return this.buscar(id);
    } catch (error) { return this.rethrow(error); }
  }

  private async locked(manager: EntityManager, id: string): Promise<Coleta> {
    const coleta = await manager.getRepository(Coleta).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
    if (!coleta) throw new NotFoundException('Coleta não encontrada.');
    return coleta;
  }

  async atualizar(id: string, dto: AtualizarColetaDto) {
    if (!Object.keys(dto).length) throw new BadRequestException('Informe ao menos um campo para atualizar.');
    try {
      await this.repository.manager.transaction(async (manager) => {
        const coleta = await this.locked(manager, id);
        if (coleta.status !== 'Agendada' && Object.keys(dto).some((field) => field !== 'observacao')) throw new ConflictException('Em uma coleta finalizada, somente a observação pode ser alterada.');
        if (dto.clienteId && dto.clienteId !== coleta.clienteId) await this.clienteAtivo(manager, dto.clienteId);
        await manager.getRepository(Coleta).save(Object.assign(coleta, dto));
      });
      return this.buscar(id);
    } catch (error) { return this.rethrow(error); }
  }

  private async finalizar(id: string, status: 'Realizada' | 'Cancelada', dto?: RealizarColetaDto) {
    await this.repository.manager.transaction(async (manager) => {
      const coleta = await this.locked(manager, id);
      if (coleta.status !== 'Agendada') throw new ConflictException('Esta coleta já foi finalizada. Atualize a lista para conferir a situação atual.');
      const result = await manager.getRepository(Coleta).update({ id, status: 'Agendada' }, { status, ...dto });
      if (result.affected !== 1) throw new ConflictException('A situação da coleta foi alterada por outra ação.');
    });
    return this.buscar(id);
  }
  realizar(id: string, dto: RealizarColetaDto) { return this.finalizar(id, 'Realizada', dto); }
  cancelar(id: string) { return this.finalizar(id, 'Cancelada'); }

  async registrarCdf(id: string, dto: RegistrarCdfDto) {
    await this.repository.manager.transaction(async (manager) => {
      const coleta = await this.locked(manager, id);
      if (coleta.status !== 'Realizada') throw new BadRequestException('Somente uma coleta realizada pode receber CDF.');
      if (dto.dataCdf < coleta.dataRealizada!) throw new BadRequestException('A data do CDF deve ser igual ou posterior à realização.');
      await manager.getRepository(Coleta).update(id, { dataCdf: dto.dataCdf });
    });
    return this.buscar(id);
  }

  async excluir(id: string): Promise<void> {
    await this.repository.manager.transaction(async (manager) => {
      const coleta = await this.locked(manager, id);
      if (coleta.status !== 'Agendada') throw new ConflictException('Somente coletas agendadas podem ser excluídas. O histórico de finalizadas é preservado.');
      await manager.getRepository(Coleta).delete({ id, status: 'Agendada' });
    });
  }
}
