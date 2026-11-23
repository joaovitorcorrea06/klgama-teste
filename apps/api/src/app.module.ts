import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { readEnvironment } from './config/environment';
import { databaseOptions } from './database/options';
import { AuthModule } from './auth/auth.module';
import { ClientesModule } from './clientes/clientes.module';

@Module({
  imports: [TypeOrmModule.forRootAsync({
    useFactory: () => ({ ...databaseOptions(readEnvironment()), retryAttempts: 3, retryDelay: 1000 }),
  }), AuthModule, ClientesModule],
})
export class AppModule {}
