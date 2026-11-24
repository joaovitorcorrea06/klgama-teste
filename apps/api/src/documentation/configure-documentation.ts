import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { readEnvironment } from '../config/environment';
import { API_SCHEMAS } from './api-schemas';

export function configureDocumentation(app: INestApplication): void {
  const { swagger } = readEnvironment();
  if (!swagger.enabled) return;
  const expected = createHash('sha256').update(`${swagger.user}:${swagger.password}`).digest();
  // Swagger é middleware, fora do guard global do Nest. Proteger antes do setup
  // cobre a página, os recursos estáticos e a especificação sob o mesmo prefixo.
  app.use('/docs', (request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'no-store');
    const encoded = /^Basic ([A-Za-z0-9+/]+=*)$/i.exec(request.headers.authorization ?? '')?.[1];
    const supplied = createHash('sha256').update(encoded ? Buffer.from(encoded, 'base64') : '').digest();
    if (!encoded || !timingSafeEqual(expected, supplied)) {
      response.setHeader('WWW-Authenticate', 'Basic realm="EcoColeta API docs", charset="UTF-8"');
      response.status(401).json({ statusCode: 401, code: 'NAO_AUTENTICADO', message: 'A documentação exige suas credenciais próprias de acesso.' });
      return;
    }
    next();
  });
  const config = new DocumentBuilder().setTitle('EcoColeta · API').setVersion('1.0.0')
    .setDescription('Operação inteiramente fictícia. Decimais são strings; datas civis usam YYYY-MM-DD. As regras de negócio são validadas pela API. Para testar pelo navegador, abra a documentação pelo proxy /api/docs, faça login e informe o accessToken em Authorize. A senha Basic protege somente a documentação.')
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
