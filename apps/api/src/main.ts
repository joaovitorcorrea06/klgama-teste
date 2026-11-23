import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { readEnvironment } from './config/environment';
import { HttpExceptionFilter } from './common/http-exception.filter';

async function bootstrap(): Promise<void> {
  const environment = readEnvironment();
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({ origin: environment.webOrigin, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] });
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    transformOptions: { enableImplicitConversion: false },
  }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
  await app.listen(environment.apiPort, '0.0.0.0');
  Logger.log(`API iniciada na porta ${environment.apiPort}.`, 'Bootstrap');
}

void bootstrap().catch(() => {
  Logger.error('Não foi possível iniciar a API. Confira a configuração e a disponibilidade do banco.', undefined, 'Bootstrap');
  process.exitCode = 1;
});
