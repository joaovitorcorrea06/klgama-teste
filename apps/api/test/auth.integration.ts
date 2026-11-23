import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { Controller, Get, INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { compare } from 'bcryptjs';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { JWT_AUDIENCE, JWT_ISSUER, SESSION_COOKIE } from '../src/auth/auth.types';
import { configureApp } from '../src/config/configure-app';
import { readEnvironment } from '../src/config/environment';
import { databaseOptions } from '../src/database/options';

@Controller('test-protected')
class ProtectedController {
  @Get() get() { return { protegido: true }; }
}

test('autenticação com HTTP e PostgreSQL isolado', async (context) => {
  const environment = readEnvironment();
  if (environment.nodeEnv === 'production') throw new Error('Teste proibido em produção.');
  const originalDatabase = process.env.DB_NAME;
  const originalTrustProxy = process.env.API_TRUST_PROXY;
  const database = `ecocoleta_auth_${randomUUID().replaceAll('-', '')}`;
  const admin = new Client({ host: environment.database.host, port: environment.database.port, user: environment.database.username, password: environment.database.password, database: environment.database.database, ssl: environment.database.ssl });
  const source = new DataSource({ ...databaseOptions(environment), database });
  let app: INestApplication | undefined;
  let created = false;
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${database}"`);
    created = true;
    process.env.DB_NAME = database;
    process.env.API_TRUST_PROXY = 'true';
    await source.initialize();
    await source.runMigrations();
    const module = await Test.createTestingModule({ imports: [AppModule], controllers: [ProtectedController] }).compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const request = (path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) => fetch(`${base}${path}`, {
      method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const account = { nome: '  Pessoa   Fictícia  ', email: '  Pessoa@Example.test ', senha: 'Uma frase fictícia 123' };
    let id = '';
    let token = '';
    let cookie = '';

    await context.test('valida campos, limita bytes da senha e bloqueia propriedades extras', async () => {
      const invalid = await request('/auth/cadastro', 'POST', { nome: 'A', email: 'inválido', senha: 'curta', id: randomUUID() });
      assert.equal(invalid.status, 400);
      const body = await invalid.json() as { errors: Record<string, string[]> };
      assert.ok(body.errors.nome && body.errors.email && body.errors.senha && body.errors.id);
      const long = await request('/auth/cadastro', 'POST', { ...account, senha: 'á'.repeat(40) });
      assert.equal(long.status, 400);
    });

    await context.test('normaliza cadastro, guarda hash e retorna somente campos públicos', async () => {
      const response = await request('/auth/cadastro', 'POST', account);
      assert.equal(response.status, 201);
      const result = await response.json() as { id: string; nome: string; email: string };
      id = result.id;
      assert.equal(result.nome, 'Pessoa Fictícia');
      assert.equal(result.email, 'pessoa@example.test');
      assert.equal('senha' in result, false);
      assert.equal('senhaHash' in result, false);
      const [stored] = await source.query('SELECT senha_hash FROM usuarios WHERE id = $1', [id]) as { senha_hash: string }[];
      assert.notEqual(stored.senha_hash, account.senha);
      assert.equal(await compare(account.senha, stored.senha_hash), true);
      const duplicate = await request('/auth/cadastro', 'POST', { ...account, email: 'PESSOA@example.test' });
      assert.equal(duplicate.status, 409);
    });

    await context.test('duplicidade simultânea retorna 201 e 409', async () => {
      const concurrent = { ...account, email: 'concurrent@example.test' };
      const headers = { 'X-Forwarded-For': '203.0.113.2' };
      const responses = await Promise.all([request('/auth/cadastro', 'POST', concurrent, headers), request('/auth/cadastro', 'POST', concurrent, headers)]);
      assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
    });

    await context.test('credenciais incorretas não revelam se o usuário existe', async () => {
      const wrong = await request('/auth/login', 'POST', { email: account.email, senha: 'senha incorreta' });
      const absent = await request('/auth/login', 'POST', { email: 'absent@example.test', senha: account.senha });
      assert.equal(wrong.status, 401);
      assert.equal(absent.status, 401);
      assert.deepEqual(await wrong.json(), await absent.json());
    });

    await context.test('login emite JWT limitado e cookie HttpOnly com SameSite', async () => {
      const response = await request('/auth/login', 'POST', { email: account.email, senha: account.senha });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const body = await response.json() as { accessToken: string; expiresIn: number; usuario: { id: string } };
      token = body.accessToken;
      assert.equal(body.usuario.id, id);
      const payload = await new JwtService().verifyAsync<{ sub: string; exp: number; iat: number }>(token, { secret: environment.auth.secret, algorithms: ['HS256'], issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
      assert.equal(payload.sub, id);
      assert.equal(payload.exp - payload.iat, environment.auth.expiresIn);
      const setCookie = response.headers.get('set-cookie') ?? '';
      assert.match(setCookie, /HttpOnly/);
      assert.match(setCookie, /SameSite=Strict/);
      cookie = setCookie.split(';')[0];
      assert.ok(cookie.startsWith(`${SESSION_COOKIE}=`));
    });

    await context.test('proteção é global e aceita cookie ou Bearer válido', async () => {
      assert.equal((await request('/auth/me')).status, 401);
      assert.equal((await request('/test-protected')).status, 401);
      assert.equal((await request('/test-protected', 'GET', undefined, { Authorization: `Bearer ${token}` })).status, 200);
      const response = await request('/auth/me', 'GET', undefined, { Cookie: cookie });
      assert.equal(response.status, 200);
      const body = await response.json() as { usuario: { id: string }; expiraEm: string };
      assert.equal(body.usuario.id, id);
      assert.ok(Date.parse(body.expiraEm) > Date.now());
      assert.equal('senhaHash' in body.usuario, false);
    });

    await context.test('recusa JWT expirado, assinatura errada e audiência diferente', async () => {
      const signer = new JwtService({ secret: environment.auth.secret });
      for (const bad of [
        'invalido',
        await signer.signAsync({ sub: id }, { expiresIn: -1, issuer: JWT_ISSUER, audience: JWT_AUDIENCE }),
        await signer.signAsync({ sub: id }, { expiresIn: 60, secret: 'outro-segredo', issuer: JWT_ISSUER, audience: JWT_AUDIENCE }),
        await signer.signAsync({ sub: id }, { expiresIn: 60, issuer: JWT_ISSUER, audience: 'outro-portal' }),
      ]) assert.equal((await request('/auth/me', 'GET', undefined, { Authorization: `Bearer ${bad}` })).status, 401);
    });

    await context.test('cookie exige origem correta para mutações e logout remove a sessão do navegador', async () => {
      assert.equal((await request('/auth/logout', 'POST', undefined, { Cookie: cookie })).status, 403);
      assert.equal((await request('/auth/logout', 'POST', undefined, { Cookie: cookie, Origin: 'https://untrusted.invalid' })).status, 403);
      const response = await request('/auth/logout', 'POST', undefined, { Cookie: cookie, Origin: environment.webOrigin });
      assert.equal(response.status, 204);
      assert.match(response.headers.get('set-cookie') ?? '', /Expires=Thu, 01 Jan 1970/);
      assert.equal((await request('/auth/me')).status, 401);
      assert.equal((await request('/auth/login', 'POST', { email: account.email, senha: account.senha }, { Origin: 'https://untrusted.invalid' })).status, 403);
    });

    await context.test('limite de tentativas retorna 429 e Retry-After', async () => {
      let limited: Response | undefined;
      for (let attempt = 0; attempt < 11; attempt++) {
        const response = await request('/auth/login', 'POST', {});
        if (response.status === 429) { limited = response; break; }
      }
      assert.ok(limited);
      assert.ok(Number(limited.headers.get('retry-after')) > 0);
    });
  } finally {
    await app?.close();
    if (source.isInitialized) await source.destroy();
    if (originalDatabase === undefined) delete process.env.DB_NAME;
    else process.env.DB_NAME = originalDatabase;
    if (originalTrustProxy === undefined) delete process.env.API_TRUST_PROXY;
    else process.env.API_TRUST_PROXY = originalTrustProxy;
    if (created) await admin.query(`DROP DATABASE "${database}"`);
    await admin.end();
  }
});
