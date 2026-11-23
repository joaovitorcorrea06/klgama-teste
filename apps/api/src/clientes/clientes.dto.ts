import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

export const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const trimText = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
const optional = (_: unknown, value: unknown) => value !== undefined;
const integer = ({ value }: { value: unknown }) => typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : value;

export class CriarClienteDto {
  @Transform(trimText)
  @IsString({ message: 'Informe o nome do cliente.' })
  @MinLength(2, { message: 'O nome deve ter pelo menos 2 caracteres.' })
  @MaxLength(160, { message: 'O nome deve ter até 160 caracteres.' })
  nome!: string;

  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.replace(/[.\s/-]/g, '') : value)
  @IsString({ message: 'Informe o CNPJ.' })
  @Matches(/^\d{14}$/, { message: 'O CNPJ deve conter 14 dígitos.' })
  cnpj!: string;

  @Transform(trimText)
  @IsString({ message: 'Informe a cidade.' })
  @MinLength(2, { message: 'A cidade deve ter pelo menos 2 caracteres.' })
  @MaxLength(120, { message: 'A cidade deve ter até 120 caracteres.' })
  cidade!: string;

  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @IsIn(UFS, { message: 'Selecione uma UF válida.' })
  uf!: string;

  @ValidateIf(optional)
  @IsBoolean({ message: 'A situação deve ser true ou false.' })
  ativo?: boolean;
}

export class AtualizarClienteDto extends PartialType(CriarClienteDto, { skipNullProperties: false }) {}

export class ListarClientesDto {
  @Transform(trimText)
  @ValidateIf(optional)
  @IsString({ message: 'A busca deve ser um texto.' })
  @MaxLength(150, { message: 'Use até 150 caracteres na busca.' })
  busca?: string;

  @Transform(({ value }: { value: unknown }) => value === 'true' ? true : value === 'false' ? false : value)
  @ValidateIf(optional)
  @IsBoolean({ message: 'O filtro ativo deve ser true ou false.' })
  ativo?: boolean;

  @Transform(integer)
  @IsInt({ message: 'A página deve ser um número inteiro.' })
  @Min(1, { message: 'A página começa em 1.' })
  @Max(100000, { message: 'A página deve ser no máximo 100000.' })
  pagina = 1;

  @Transform(integer)
  @IsInt({ message: 'O limite deve ser um número inteiro.' })
  @Min(1, { message: 'O limite mínimo é 1.' })
  @Max(100, { message: 'O limite máximo é 100.' })
  limite = 20;
}
