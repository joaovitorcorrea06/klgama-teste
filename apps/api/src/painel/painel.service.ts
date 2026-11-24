import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConsultarPainelDto } from './painel.dto';
import { PAINEL_QUERY } from './painel.query';

const index = (month: string) => Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1;
const month = (value: number) => `${String(Math.floor(value / 12)).padStart(4, '0')}-${String(value % 12 + 1).padStart(2, '0')}`;
export function resolvePeriodo(dto: ConsultarPainelDto, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(now);
  const current = `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}`;
  const fim = dto.fim ?? current;
  const inicio = dto.inicio ?? month(index(fim) - 11);
  const meses = index(fim) - index(inicio) + 1;
  if (meses < 1 || meses > 60 || inicio < '1000-01') throw new BadRequestException('Selecione um período de 1 a 60 meses, com início anterior ou igual ao fim.');
  return { inicio, fim, meses, primeiroDia: `${inicio}-01`, fimExclusivo: `${month(index(fim) + 1)}-01` };
}

@Injectable()
export class PainelService {
  constructor(private readonly source: DataSource) {}
  async consultar(dto: ConsultarPainelDto) {
    const { inicio, fim, meses, primeiroDia, fimExclusivo } = resolvePeriodo(dto);
    const [result] = await this.source.query(PAINEL_QUERY, [primeiroDia, fimExclusivo, meses]) as { dados: Record<string, unknown> }[];
    return { periodo: { inicio, fim, meses }, ...result.dados };
  }
}
