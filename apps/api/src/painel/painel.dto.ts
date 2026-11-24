import { Matches, ValidateIf } from 'class-validator';

export class ConsultarPainelDto {
  @ValidateIf((_, value: unknown) => value !== undefined)
  @Matches(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/, { message: 'Informe o mês inicial no formato YYYY-MM.' })
  inicio?: string;
  @ValidateIf((_, value: unknown) => value !== undefined)
  @Matches(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/, { message: 'Informe o mês final no formato YYYY-MM.' })
  fim?: string;
}
