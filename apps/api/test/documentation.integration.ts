import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withTestApplication } from './support/test-application';

test('Swagger desabilitado não expõe interface nem especificação', async () => {
  const original = process.env.SWAGGER_ENABLED;
  process.env.SWAGGER_ENABLED = 'false';
  try {
    await withTestApplication(async ({ base }) => {
      for (const path of ['/docs', '/docs/openapi.json', '/docs-json', '/docs-yaml']) assert.equal((await fetch(`${base}${path}`)).status, 404);
    });
  } finally { if (original === undefined) delete process.env.SWAGGER_ENABLED; else process.env.SWAGGER_ENABLED = original; }
});

test('Swagger habilitado protege interface, recursos e contrato, sem liberar API de negócio', async (context) => {
  const original = { enabled: process.env.SWAGGER_ENABLED, user: process.env.SWAGGER_USER, password: process.env.SWAGGER_PASSWORD };
  process.env.SWAGGER_ENABLED = 'true'; process.env.SWAGGER_USER = 'avaliacao_test'; process.env.SWAGGER_PASSWORD = 'documentation-fixture-only-2026';
  try {
    await withTestApplication(async ({ base }) => {
      const authorization = `Basic ${Buffer.from(`${process.env.SWAGGER_USER}:${process.env.SWAGGER_PASSWORD}`).toString('base64')}`;
      const headers = { Authorization: authorization };
      await context.test('todas as superfícies do Swagger exigem Basic próprio', async () => {
        for (const path of ['/docs', '/docs/', '/docs/openapi.json', '/docs/swagger-ui.css', '/docs/swagger-ui-bundle.js', '/docs/swagger-ui-init.js']) {
          const response = await fetch(`${base}${path}`);
          assert.equal(response.status, 401, path);
          assert.match(response.headers.get('www-authenticate') ?? '', /^Basic /);
          assert.equal(response.headers.get('cache-control'), 'no-store');
          assert.equal((await fetch(`${base}${path}`, { headers: { Authorization: 'Basic aW52YWxpZG86c2VuaGE=' } })).status, 401);
        }
        assert.equal((await fetch(`${base}/docs`, { headers: { Authorization: 'Bearer token-invalido' } })).status, 401);
        assert.equal((await fetch(`${base}/clientes`, { headers })).status, 401);
        assert.equal((await fetch(`${base}/docs-json`, { headers })).status, 404);
        assert.equal((await fetch(`${base}/docs-yaml`, { headers })).status, 404);
      });
      await context.test('HTML e recursos locais são servidos após autenticação', async () => {
        const response = await fetch(`${base}/docs`, { headers });
        assert.equal(response.status, 200);
        const html = await response.text();
        assert.match(html, /swagger-ui/);
        for (const match of html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)) {
          const asset = new URL(match[1], response.url);
          assert.equal(asset.origin, new URL(base).origin);
          assert.equal((await fetch(asset, { headers })).status, 200, asset.pathname);
        }
      });
      await context.test('contrato descreve os 19 endpoints e entradas sem campos proibidos', async () => {
        const response = await fetch(`${base}/docs/openapi.json`, { headers });
        assert.equal(response.status, 200);
        const document = await response.json() as {
          paths: Record<string, Record<string, { summary: string; security?: unknown[]; responses: Record<string, unknown> }>>;
          components: { schemas: Record<string, { properties?: Record<string, { type?: string }>; required?: string[]; additionalProperties?: boolean }> };
          security: unknown[];
        };
        const operations = Object.values(document.paths).flatMap(path => Object.entries(path).filter(([method]) => ['get', 'post', 'patch', 'delete'].includes(method)).map(([, value]) => value));
        assert.equal(operations.length, 19);
        assert.ok(operations.every(operation => operation.summary));
        assert.deepEqual(document.paths['/auth/login'].post.security, []);
        assert.deepEqual(document.paths['/auth/cadastro'].post.security, []);
        assert.deepEqual(document.security, [{ bearer: [] }]);
        const schemas = document.components.schemas;
        assert.deepEqual(schemas.CriarColetaDto.required?.sort(), ['clienteId', 'dataAgendada', 'numeroMtr', 'tipoResiduo']);
        for (const field of ['status', 'pesoKg', 'dataRealizada', 'dataCdf']) assert.equal(schemas.CriarColetaDto.properties?.[field], undefined);
        assert.equal(schemas.CriarColetaDto.properties?.valorReceita.type, 'string');
        assert.equal(schemas.CriarColetaDto.additionalProperties, false);
        assert.ok(!schemas.AtualizarColetaDto.required?.length);
        assert.ok(!schemas.AtualizarClienteDto.required?.length);
        assert.equal(schemas.UsuarioPublico.properties?.senhaHash, undefined);
        assert.equal(schemas.UsuarioPublico.properties?.senha, undefined);
        assert.equal(schemas.Painel.properties?.atencao !== undefined, true);
      });
    });
  } finally {
    for (const [name, value] of Object.entries({ SWAGGER_ENABLED: original.enabled, SWAGGER_USER: original.user, SWAGGER_PASSWORD: original.password })) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
