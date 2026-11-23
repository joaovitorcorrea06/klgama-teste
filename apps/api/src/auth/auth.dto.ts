import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength, ValidateBy } from 'class-validator';

const normalizeEmail = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value;

class EmailDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(254, { message: 'O e-mail deve ter até 254 caracteres.' })
  email!: string;
}

function Senha(minimum: number): PropertyDecorator {
  const decorators = [
    IsString({ message: 'Informe sua senha.' }),
    MinLength(minimum, { message: minimum === 1 ? 'Informe sua senha.' : `Use uma senha com pelo menos ${minimum} caracteres.` }),
    MaxLength(72, { message: 'A senha deve ter até 72 caracteres.' }),
    ValidateBy({ name: 'senhaBytes', validator: { validate: (value: unknown) => typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= 72, defaultMessage: () => 'A senha deve ter até 72 bytes. Use menos caracteres.' } }),
  ];
  return (target, property) => { decorators.forEach((decorate) => decorate(target, property)); };
}

export class LoginDto extends EmailDto {
  @Senha(1)
  senha!: string;
}

export class CadastroDto extends EmailDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value)
  @IsString({ message: 'Informe seu nome.' })
  @MinLength(2, { message: 'O nome deve ter pelo menos 2 caracteres.' })
  @MaxLength(120, { message: 'O nome deve ter até 120 caracteres.' })
  nome!: string;

  @Senha(10)
  senha!: string;
}
