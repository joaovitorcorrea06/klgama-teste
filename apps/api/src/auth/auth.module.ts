import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { readEnvironment } from '../config/environment';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { JWT_AUDIENCE, JWT_ISSUER } from './auth.types';

@Module({
  imports: [
    UsuariosModule,
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 120 }], errorMessage: 'Muitas tentativas. Aguarde um minuto antes de tentar novamente.' }),
    JwtModule.registerAsync({ useFactory: () => ({
      secret: readEnvironment().auth.secret,
      signOptions: { expiresIn: readEnvironment().auth.expiresIn, algorithm: 'HS256', issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
      verifyOptions: { algorithms: ['HS256'], issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
    }) }),
  ],
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AuthModule {}
