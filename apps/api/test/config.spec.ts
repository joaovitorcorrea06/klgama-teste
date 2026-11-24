import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readEnvironment } from '../src/config/environment';

const valid: NodeJS.ProcessEnv = {
  DB_HOST: '127.0.0.1', DB_NAME: 'test', DB_USER: 'test', DB_PASSWORD: 'test',
  WEB_ORIGIN: 'http://localhost:5173',
  JWT_SECRET: 'test-only-secret-32-bytes-or-more-123456789',
};

test('recusa configuração incompleta sem revelar valores sensíveis', () => {
  assert.throws(() => readEnvironment({ ...valid, DB_PASSWORD: '' }), /DB_PASSWORD/);
});

test('recusa portas, booleanos e origens ambíguas', () => {
  for (const value of ['0', '65536', '3000abc', '-1', '3.5', '']) {
    assert.throws(() => readEnvironment({ ...valid, API_PORT: value }));
  }
  assert.throws(() => readEnvironment({ ...valid, DB_SSL: 'yes' }));
  assert.throws(() => readEnvironment({ ...valid, WEB_ORIGIN: 'https://example.com/path' }));
  assert.throws(() => readEnvironment({ ...valid, WEB_ORIGIN: '*' }));
});

test('SSL exige validação do certificado quando habilitado', () => {
  assert.deepEqual(readEnvironment({ ...valid, DB_SSL: 'true' }).database.ssl, { rejectUnauthorized: true });
  assert.equal(readEnvironment(valid).database.ssl, false);
});

test('recusa segredo de exemplo, expiração inválida e cookie inseguro em HTTPS', () => {
  assert.throws(() => readEnvironment({ ...valid, JWT_SECRET: 'replace-with-a-random-secret-of-at-least-32-characters' }));
  assert.throws(() => readEnvironment({ ...valid, JWT_EXPIRES_IN: '0h' }));
  assert.throws(() => readEnvironment({ ...valid, JWT_EXPIRES_IN: '10days' }));
  assert.throws(() => readEnvironment({ ...valid, WEB_ORIGIN: 'https://example.com' }));
  assert.equal(readEnvironment({ ...valid, JWT_EXPIRES_IN: '30m' }).auth.expiresIn, 1800);
});

test('Swagger é opcional e exige credenciais próprias ao habilitar', () => {
  assert.equal(readEnvironment(valid).swagger.enabled, false);
  assert.throws(() => readEnvironment({ ...valid, SWAGGER_ENABLED: 'yes' }));
  assert.throws(() => readEnvironment({ ...valid, SWAGGER_ENABLED: 'true' }));
  assert.throws(() => readEnvironment({ ...valid, SWAGGER_ENABLED: 'true', SWAGGER_USER: 'avaliacao', SWAGGER_PASSWORD: 'replace-documentation-secret' }));
  assert.equal(readEnvironment({ ...valid, SWAGGER_ENABLED: 'true', SWAGGER_USER: 'avaliacao', SWAGGER_PASSWORD: 'fixture-documentation-password' }).swagger.enabled, true);
});
