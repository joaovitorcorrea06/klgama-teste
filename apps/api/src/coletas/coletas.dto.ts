import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateBy, ValidateIf } from 'class-validator';

const optional = (_: unknown, value: unknown) => value !== undefined;
const text = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
export function isCivilDate(value: unknown): boolean {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
const CivilDate = () => ValidateBy({ name: 'civilDate', validator: { validate: isCivilDate, defaultMessage: () => 'Informe uma data válida no formato YYYY-MM-DD (anos 1000 a 9999).' } });
const Money = () => Matches(/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/, { message: 'Informe um decimal não negativo como texto, com até 12 inteiros e 2 casas (ex.: "1250.50").' });

export class CriarColetaDto {
  @IsUUID('4', { message: 'Selecione um cliente válido.' }) clienteId!: string;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @IsString() @MinLength(1) @MaxLength(80) numeroMtr!: string;
  @Transform(text) @IsString() @MinLength(2) @MaxLength(160) tipoResiduo!: string;
  @CivilDate() dataAgendada!: string;
  @ValidateIf(optional) @Money() valorReceita?: string;
  @ValidateIf(optional) @Money() valorDespesa?: string;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @ValidateIf(optional) @IsString() @MaxLength(2000) observacao?: string;
}
export class AtualizarColetaDto extends PartialType(CriarColetaDto, { skipNullProperties: false }) {}
export class RealizarColetaDto {
  @Matches(/^(0|[1-9]\d{0,10})(\.\d{1,3})?$/, { message: 'Informe o peso em kg como texto, com até 11 inteiros e 3 casas decimais.' })
  @ValidateBy({ name: 'positiveWeight', validator: { validate: (value: unknown) => typeof value === 'string' && /[1-9]/.test(value), defaultMessage: () => 'O peso deve ser maior que zero.' } })
  pesoKg!: string;
  @CivilDate() dataRealizada!: string;
}
export class RegistrarCdfDto { @CivilDate() dataCdf!: string; }
export class BuscarResiduosDto {
  @Transform(text) @ValidateIf(optional) @IsString() @MaxLength(160) busca?: string;
}
export class ListarColetasDto {
  @ValidateIf(optional) @IsUUID('4') clienteId?: string;
  @ValidateIf(optional) @IsIn(['Agendada', 'Realizada', 'Cancelada']) status?: string;
  @Transform(text) @ValidateIf(optional) @IsString() @MinLength(2) @MaxLength(160) tipoResiduo?: string;
  @ValidateIf(optional) @CivilDate() inicio?: string;
  @ValidateIf(optional) @CivilDate() fim?: string;
  @Transform(({ value }: { value: unknown }) => value === 'true' ? true : value === 'false' ? false : value)
  @ValidateIf(optional) @IsBoolean() semCdf?: boolean;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : value)
  @IsInt() @Min(1) @Max(100000) pagina = 1;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : value)
  @IsInt() @Min(1) @Max(100) limite = 20;
}
