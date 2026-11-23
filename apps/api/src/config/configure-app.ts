import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { HttpExceptionFilter } from '../common/http-exception.filter';
import { readEnvironment } from './environment';

function fieldErrors(errors: ValidationError[], prefix = ''): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const error of errors) {
    const key = prefix ? `${prefix}.${error.property}` : error.property;
    if (error.constraints) result[key] = Object.values(error.constraints);
    Object.assign(result, fieldErrors(error.children ?? [], key));
  }
  return result;
}

export function configureApp(app: INestApplication): void {
  const environment = readEnvironment();
  app.getHttpAdapter().getInstance().set('trust proxy', environment.trustProxy ? 1 : false);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: environment.webOrigin, credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] });
  app.useGlobalPipes(new ValidationPipe({
    transform: true, whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true,
    transformOptions: { enableImplicitConversion: false },
    exceptionFactory: (errors) => new BadRequestException({ message: 'Confira os dados informados.', errors: fieldErrors(errors) }),
  }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
}
