import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, EntityManager, QueryFailedError, Repository } from 'typeorm';
import { Cliente } from './cliente.entity';
import { AtualizarClienteDto, CriarClienteDto, ListarClientesDto } from './clientes.dto';

@Injectable()
export class ClientesService {
  constructor(@InjectRepository(Cliente) private readonly repository: Repository<Cliente>) {}

  private rethrow(error: unknown): never {
    if (error instanceof QueryFailedError) {
      if (error.driverError.code === '23505' && error.driverError.constraint === 'clientes_cnpj_key') {
        throw new ConflictException('Este CNPJ já está cadastrado. Confira os dados ou edite o cliente existente.');
      }
      if (error.driverError.code === '23503') throw new ConflictException('Este cliente possui coletas e não pode ser excluído. Inative-o para preservar o histórico.');
    }
    throw error;
  }

  async listar(dto: ListarClientesDto) {
    const query = this.repository.createQueryBuilder('cliente');
    if (dto.ativo !== undefined) query.andWhere('cliente.ativo = :ativo', { ativo: dto.ativo });
    const escape = (value: string) => value.replace(/[\\%_]/g, '\\$&');
    if (dto.busca) {
      const busca = `%${escape(dto.busca)}%`;
      const digits = dto.busca.replace(/[.\s/-]/g, '');
      query.andWhere(new Brackets((where) => where.where('cliente.nome ILIKE :busca', { busca })
        .orWhere('cliente.cidade ILIKE :busca')
        .orWhere('cliente.cnpj ILIKE :cnpj', { cnpj: `%${escape(digits)}%` })));
    }
    if (dto.nome) query.andWhere('cliente.nome ILIKE :nome', { nome: `%${escape(dto.nome)}%` });
    if (dto.cnpj) query.andWhere('cliente.cnpj LIKE :filtroCnpj', { filtroCnpj: `%${dto.cnpj}%` });
    if (dto.cidade) query.andWhere('cliente.cidade ILIKE :cidade', { cidade: `%${escape(dto.cidade)}%` });
    const total = await query.getCount();
    const { entities, raw } = await query.addSelect('EXISTS (SELECT 1 FROM coletas c WHERE c.cliente_id = cliente.id)', 'possuiColetas')
      .orderBy('cliente.nome', 'ASC').addOrderBy('cliente.id', 'ASC')
      .skip((dto.pagina - 1) * dto.limite).take(dto.limite).getRawAndEntities<{ possuiColetas: boolean }>();
    return {
      itens: entities.map((cliente, index) => ({ ...cliente, possuiColetas: raw[index].possuiColetas })),
      meta: { pagina: dto.pagina, limite: dto.limite, total, totalPaginas: Math.ceil(total / dto.limite) },
    };
  }

  async buscar(id: string) {
    const cliente = await this.repository.findOneBy({ id });
    if (!cliente) throw new NotFoundException('Cliente não encontrado.');
    return { ...cliente, possuiColetas: await this.possuiColetas(this.repository.manager, id) };
  }

  private async possuiColetas(manager: EntityManager, id: string): Promise<boolean> {
    const [result] = await manager.query('SELECT EXISTS (SELECT 1 FROM coletas WHERE cliente_id = $1) AS existe', [id]) as { existe: boolean }[];
    return result.existe;
  }

  async criar(dto: CriarClienteDto): Promise<Cliente> {
    try { return await this.repository.save(this.repository.create({ ...dto, ativo: dto.ativo ?? true })); }
    catch (error) { return this.rethrow(error); }
  }

  async atualizar(id: string, dto: AtualizarClienteDto): Promise<Cliente> {
    if (!Object.keys(dto).length) throw new BadRequestException('Informe ao menos um campo para atualizar.');
    try {
      return await this.repository.manager.transaction(async (manager) => {
        const repository = manager.getRepository(Cliente);
        const cliente = await repository.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
        if (!cliente) throw new NotFoundException('Cliente não encontrado.');
        return repository.save(Object.assign(cliente, dto));
      });
    } catch (error) { return this.rethrow(error); }
  }

  async excluir(id: string): Promise<void> {
    try {
      await this.repository.manager.transaction(async (manager) => {
        const repository = manager.getRepository(Cliente);
        const cliente = await repository.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
        if (!cliente) throw new NotFoundException('Cliente não encontrado.');
        if (await this.possuiColetas(manager, id)) throw new ConflictException('Este cliente possui coletas e não pode ser excluído. Inative-o para preservar o histórico.');
        await repository.delete(id);
      });
    } catch (error) { this.rethrow(error); }
  }
}
