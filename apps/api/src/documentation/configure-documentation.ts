import { UnauthorizedException, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { readEnvironment } from '../config/environment';
import { AuthService } from '../auth/auth.service';
import { SESSION_COOKIE } from '../auth/auth.types';
import { API_SCHEMAS } from './api-schemas';

export function configureDocumentation(app: INestApplication): void {
  const { swagger } = readEnvironment();
  if (!swagger.enabled) return;
  const auth = app.get(AuthService);
  // Swagger é middleware, fora do guard global do Nest. A mesma validação de JWT
  // protege página, recursos e contrato antes de o Swagger registrar suas rotas.
  app.use('/docs', async (request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'no-store');
    try {
      const authorization = request.headers.authorization;
      const bearer = authorization?.match(/^Bearer ([^\s]+)$/i)?.[1];
      const token: unknown = authorization ? bearer : request.cookies?.[SESSION_COOKIE];
      if (typeof token !== 'string' || !token) throw new UnauthorizedException('Entre no portal antes de abrir a documentação.');
      await auth.validarToken(token);
      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) response.status(401).json({ statusCode: 401, code: 'NAO_AUTENTICADO', message: error.message });
      else next(error);
    }
  });
  const config = new DocumentBuilder().setTitle('EcoColeta · API').setVersion('1.0.0')
    .setDescription('Operação inteiramente fictícia. Decimais são strings; datas civis usam YYYY-MM-DD. As regras de negócio são validadas pela API. Para testar pelo navegador, entre no portal, abra a documentação pelo proxy /api/docs e informe o accessToken em Authorize. A documentação exige JWT válido em cookie HttpOnly ou Bearer, como as rotas de negócio.')
    .addServer('/api', 'Proxy do portal (recomendado)')
    .addServer('/', 'API direta, sem proxy')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
    .addSecurityRequirements('bearer').build();
  const document = SwaggerModule.createDocument(app, config);
  document.components ??= {};
  document.components.schemas = { ...document.components.schemas, ...API_SCHEMAS };
  for (const [name, schema] of Object.entries(document.components.schemas)) if (name.endsWith('Dto') && !('$ref' in schema)) schema.additionalProperties = false;
  for (const item of Object.values(document.paths)) {
    for (const method of ['get', 'post', 'patch', 'delete'] as const) {
      const operation = item?.[method];
      if (!operation) continue;
      for (const [status, description] of Object.entries({ 400: 'Dados ou regra de negócio inválidos.', 401: 'Sessão ausente, inválida ou expirada.', 403: 'Origem não permitida.', 404: 'Recurso não encontrado.', 409: 'Duplicidade ou conflito de estado.', 429: 'Limite de tentativas excedido.' })) {
        operation.responses[status] = { description, content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } };
      }
    }
  }
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs/openapi.json', raw: ['json'], customSiteTitle: 'EcoColeta · Documentação da API',
    swaggerOptions: { persistAuthorization: false, validatorUrl: null, displayRequestDuration: true },
  });
}
