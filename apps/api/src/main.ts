import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { readEnvironment } from './config/environment';
import { configureApp } from './config/configure-app';

async function bootstrap(): Promise<void> {
  const environment = readEnvironment();
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(environment.apiPort, '0.0.0.0');
  Logger.log(`API iniciada na porta ${environment.apiPort}.`, 'Bootstrap');
}

void bootstrap().catch(() => {
  Logger.error('Não foi possível iniciar a API. Confira a configuração e a disponibilidade do banco.', undefined, 'Bootstrap');
  process.exitCode = 1;
});
