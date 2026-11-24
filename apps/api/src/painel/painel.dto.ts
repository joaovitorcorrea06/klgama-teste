import { ApiPropertyOptional } from '@nestjs/swagger';
import { Matches, ValidateIf } from 'class-validator';

export class ConsultarPainelDto {
  @ValidateIf((_, value: unknown) => value !== undefined)
  @Matches(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/, { message: 'Informe o mês inicial no formato YYYY-MM.' })
  @ApiPropertyOptional({ type: String, example: '2025-12', description: 'Mês inicial inclusivo, YYYY-MM. Período de 1 a 60 meses.' }) inicio?: string;
  @ValidateIf((_, value: unknown) => value !== undefined)
  @Matches(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/, { message: 'Informe o mês final no formato YYYY-MM.' })
  @ApiPropertyOptional({ type: String, example: '2026-11', description: 'Mês final inclusivo, YYYY-MM. Padrão: mês atual de São Paulo.' }) fim?: string;
}
