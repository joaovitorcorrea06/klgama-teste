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
  const original = process.env.SWAGGER_ENABLED;
  process.env.SWAGGER_ENABLED = 'true';
  try {
    await withTestApplication(async ({ base }) => {
      const account = { nome: 'Pessoa Swagger Fictícia', email: 'swagger@example.test', senha: 'SwaggerFicticio2026!' };
      assert.equal((await fetch(`${base}/auth/cadastro`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(account) })).status, 201);
      const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: account.email, senha: account.senha }) });
      assert.equal(login.status, 200);
      const cookie = (login.headers.get('set-cookie') ?? '').split(';')[0];
      const headers = { Cookie: cookie };
      const { accessToken } = await login.json() as { accessToken: string };
      await context.test('cookie e Bearer válidos autorizam; token inválido e Basic são recusados', async () => {
        for (const path of ['/docs', '/docs/openapi.json', '/docs/swagger-ui.css']) {
          assert.equal((await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } })).status, 200);
          assert.equal((await fetch(`${base}${path}`, { headers: { Cookie: 'ecocoleta_session=invalido' } })).status, 401);
          assert.equal((await fetch(`${base}${path}`, { headers: { ...headers, Authorization: 'Basic aW52YWxpZG86c2VuaGE=' } })).status, 401);
        }
      });
      await context.test('todas as superfícies do Swagger exigem JWT válido', async () => {
        for (const path of ['/docs', '/docs/', '/docs/openapi.json', '/docs/swagger-ui.css', '/docs/swagger-ui-bundle.js', '/docs/swagger-ui-init.js']) {
          const response = await fetch(`${base}${path}`);
          assert.equal(response.status, 401, path);
          assert.equal(response.headers.get('cache-control'), 'no-store');
          assert.equal((await fetch(`${base}${path}`, { headers: { Authorization: 'Basic aW52YWxpZG86c2VuaGE=' } })).status, 401);
        }
        assert.equal((await fetch(`${base}/docs`, { headers: { Authorization: 'Bearer token-invalido' } })).status, 401);
        assert.equal((await fetch(`${base}/clientes`)).status, 401);
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
      await context.test('os 17 endpoints privados recusam chamadas sem sessão', async () => {
        const response = await fetch(`${base}/docs/openapi.json`, { headers });
        const document = await response.json() as { paths: Record<string, Record<string, unknown>> };
        let checked = 0;
        for (const [path, operations] of Object.entries(document.paths)) {
          if (['/auth/login', '/auth/cadastro'].includes(path)) continue;
          for (const method of Object.keys(operations).filter(value => ['get', 'post', 'patch', 'delete'].includes(value))) {
            const url = `${base}${path.replace(/\{[^}]+\}/g, '00000000-0000-4000-8000-000000000001')}`;
            const result = await fetch(url, { method: method.toUpperCase(), ...(['post', 'patch'].includes(method) ? { headers: { 'Content-Type': 'application/json' }, body: '{}' } : {}) });
            assert.equal(result.status, 401, `${method.toUpperCase()} ${path}`);
            checked++;
          }
        }
        assert.equal(checked, 17);
      });
      await context.test('contrato descreve os 19 endpoints e entradas sem campos proibidos', async () => {
        const response = await fetch(`${base}/docs/openapi.json`, { headers });
        assert.equal(response.status, 200);
        const document = await response.json() as {
          paths: Record<string, Record<string, { summary: string; security?: unknown[]; responses: Record<string, unknown> }>>;
          components: { schemas: Record<string, { properties?: Record<string, { type?: string; minLength?: number }>; required?: string[]; additionalProperties?: boolean }> };
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
        assert.equal(schemas.CadastroDto.properties?.senha.minLength, 10);
        assert.equal(schemas.LoginDto.properties?.senha.minLength, 1);
        assert.ok(!schemas.AtualizarColetaDto.required?.length);
        assert.ok(!schemas.AtualizarClienteDto.required?.length);
        assert.equal(schemas.UsuarioPublico.properties?.senhaHash, undefined);
        assert.equal(schemas.UsuarioPublico.properties?.senha, undefined);
        assert.equal(schemas.Painel.properties?.atencao !== undefined, true);
      });
    });
  } finally {
    if (original === undefined) delete process.env.SWAGGER_ENABLED; else process.env.SWAGGER_ENABLED = original;
  }
});
