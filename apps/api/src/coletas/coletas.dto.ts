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
  @IsString({ message: 'Informe o número do MTR.' }) @MinLength(1, { message: 'Informe o número do MTR.' }) @MaxLength(80, { message: 'O MTR deve ter até 80 caracteres.' }) numeroMtr!: string;
  @Transform(text) @IsString({ message: 'Informe o tipo de resíduo.' }) @MinLength(2, { message: 'O tipo de resíduo deve ter pelo menos 2 caracteres.' }) @MaxLength(160, { message: 'O tipo de resíduo deve ter até 160 caracteres.' }) tipoResiduo!: string;
  @CivilDate() dataAgendada!: string;
  @ValidateIf(optional) @Money() valorReceita?: string;
  @ValidateIf(optional) @Money() valorDespesa?: string;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @ValidateIf(optional) @IsString({ message: 'A observação deve ser um texto.' }) @MaxLength(2000, { message: 'Use até 2000 caracteres na observação.' }) observacao?: string;
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
  @Transform(text) @ValidateIf(optional) @IsString({ message: 'A busca deve ser um texto.' }) @MaxLength(160, { message: 'Use até 160 caracteres na busca.' }) busca?: string;
}
export class ListarColetasDto {
  @ValidateIf(optional) @IsUUID('4', { message: 'Selecione um cliente válido.' }) clienteId?: string;
  @ValidateIf(optional) @IsIn(['Agendada', 'Realizada', 'Cancelada'], { message: 'Selecione Agendada, Realizada ou Cancelada.' }) status?: string;
  @Transform(text) @ValidateIf(optional) @IsString({ message: 'Informe o tipo de resíduo.' }) @MinLength(2, { message: 'O tipo de resíduo deve ter pelo menos 2 caracteres.' }) @MaxLength(160, { message: 'O tipo de resíduo deve ter até 160 caracteres.' }) tipoResiduo?: string;
  @ValidateIf(optional) @CivilDate() inicio?: string;
  @ValidateIf(optional) @CivilDate() fim?: string;
  @Transform(({ value }: { value: unknown }) => value === 'true' ? true : value === 'false' ? false : value)
  @ValidateIf(optional) @IsBoolean({ message: 'O filtro semCdf deve ser true ou false.' }) semCdf?: boolean;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : value)
  @IsInt({ message: 'A página deve ser um número inteiro.' }) @Min(1, { message: 'A página começa em 1.' }) @Max(100000, { message: 'A página deve ser no máximo 100000.' }) pagina = 1;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : value)
  @IsInt({ message: 'O limite deve ser um número inteiro.' }) @Min(1, { message: 'O limite mínimo é 1.' }) @Max(100, { message: 'O limite máximo é 100.' }) limite = 20;
}
