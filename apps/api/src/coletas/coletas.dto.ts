import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
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
  @IsUUID('4', { message: 'Selecione um cliente válido.' }) @ApiProperty({ type: String, format: 'uuid', description: 'Cliente ativo para novos vínculos.' }) clienteId!: string;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @IsString({ message: 'Informe o número do MTR.' }) @MinLength(1, { message: 'Informe o número do MTR.' }) @MaxLength(80, { message: 'O MTR deve ter até 80 caracteres.' }) @ApiProperty({ type: String, minLength: 1, maxLength: 80, example: 'MTR-2026-001', description: 'Único, aparado e convertido para maiúsculas.' }) numeroMtr!: string;
  @Transform(text) @IsString({ message: 'Informe o tipo de resíduo.' }) @MinLength(2, { message: 'O tipo de resíduo deve ter pelo menos 2 caracteres.' }) @MaxLength(160, { message: 'O tipo de resíduo deve ter até 160 caracteres.' }) @ApiProperty({ type: String, minLength: 2, maxLength: 160, example: 'Papel reciclável', description: 'Espaços normalizados. No filtro, correspondência exata.' }) tipoResiduo!: string;
  @CivilDate() @ApiProperty({ type: String, format: 'date', example: '2026-11-24' }) dataAgendada!: string;
  @ValidateIf(optional) @Money() @ApiPropertyOptional({ type: String, example: '1250.50', default: '0.00', description: 'Decimal não negativo em string, até 12 inteiros e 2 casas, sem milhar.' }) valorReceita?: string;
  @ValidateIf(optional) @Money() @ApiPropertyOptional({ type: String, example: '350.25', default: '0.00', description: 'Decimal não negativo em string, até 12 inteiros e 2 casas, sem milhar.' }) valorDespesa?: string;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @ValidateIf(optional) @IsString({ message: 'A observação deve ser um texto.' }) @MaxLength(2000, { message: 'Use até 2000 caracteres na observação.' }) @ApiPropertyOptional({ type: String, maxLength: 2000, description: 'Use string vazia para limpar; null é rejeitado.' }) observacao?: string;
}
export class AtualizarColetaDto extends PartialType(CriarColetaDto, { skipNullProperties: false }) {}
export class RealizarColetaDto {
  @Matches(/^(0|[1-9]\d{0,10})(\.\d{1,3})?$/, { message: 'Informe o peso em kg como texto, com até 11 inteiros e 3 casas decimais.' })
  @ValidateBy({ name: 'positiveWeight', validator: { validate: (value: unknown) => typeof value === 'string' && /[1-9]/.test(value), defaultMessage: () => 'O peso deve ser maior que zero.' } })
  @ApiProperty({ type: String, example: '1250.500', description: 'Peso positivo em kg, até 11 inteiros e 3 casas decimais.' }) pesoKg!: string;
  @CivilDate() @ApiProperty({ type: String, format: 'date', example: '2026-11-24' }) dataRealizada!: string;
}
export class RegistrarCdfDto { @CivilDate() @ApiProperty({ type: String, format: 'date', example: '2026-11-25', description: 'Somente realizada; igual ou posterior à realização.' }) dataCdf!: string; }
export class BuscarResiduosDto {
  @Transform(text) @ValidateIf(optional) @IsString({ message: 'A busca deve ser um texto.' }) @MaxLength(160, { message: 'Use até 160 caracteres na busca.' }) @ApiPropertyOptional({ type: String, maxLength: 160, description: 'Trecho literal do tipo de resíduo; até 20 sugestões.' }) busca?: string;
}
export class ListarColetasDto {
  @ValidateIf(optional) @IsUUID('4', { message: 'Selecione um cliente válido.' }) @ApiPropertyOptional({ type: String, format: 'uuid', description: 'Filtra pelo cliente, incluindo vínculos históricos com clientes inativos.' }) clienteId?: string;
  @ValidateIf(optional) @IsIn(['Agendada', 'Realizada', 'Cancelada'], { message: 'Selecione Agendada, Realizada ou Cancelada.' }) @ApiPropertyOptional({ type: String, enum: ['Agendada', 'Realizada', 'Cancelada'] }) status?: string;
  @Transform(text) @ValidateIf(optional) @IsString({ message: 'Informe o tipo de resíduo.' }) @MinLength(2, { message: 'O tipo de resíduo deve ter pelo menos 2 caracteres.' }) @MaxLength(160, { message: 'O tipo de resíduo deve ter até 160 caracteres.' }) @ApiPropertyOptional({ type: String, minLength: 2, maxLength: 160, example: 'Papel reciclável', description: 'Espaços normalizados. No filtro, correspondência exata.' }) tipoResiduo?: string;
  @ValidateIf(optional) @CivilDate() @ApiPropertyOptional({ type: String, format: 'date', description: 'Limite inclusivo da data agendada.' }) inicio?: string;
  @ValidateIf(optional) @CivilDate() @ApiPropertyOptional({ type: String, format: 'date', description: 'Limite inclusivo da data agendada.' }) fim?: string;
  @Transform(({ value }: { value: unknown }) => value === 'true' ? true : value === 'false' ? false : value)
  @ValidateIf(optional) @IsBoolean({ message: 'O filtro semCdf deve ser true ou false.' }) @ApiPropertyOptional({ type: Boolean, description: 'true: sem CDF em qualquer estado. Combine com Realizada para pendências.' }) semCdf?: boolean;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : value)
  @IsInt({ message: 'A página deve ser um número inteiro.' }) @Min(1, { message: 'A página começa em 1.' }) @Max(100000, { message: 'A página deve ser no máximo 100000.' }) @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100000, default: 1 }) pagina = 1;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : value)
  @IsInt({ message: 'O limite deve ser um número inteiro.' }) @Min(1, { message: 'O limite mínimo é 1.' }) @Max(100, { message: 'O limite máximo é 100.' }) @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100, default: 20 }) limite = 20;
}
