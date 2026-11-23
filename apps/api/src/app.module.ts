import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { readEnvironment } from './config/environment';
import { databaseOptions } from './database/options';

@Module({
  imports: [TypeOrmModule.forRootAsync({
    useFactory: () => ({ ...databaseOptions(readEnvironment()), retryAttempts: 3, retryDelay: 1000 }),
  })],
})
export class AppModule {}
