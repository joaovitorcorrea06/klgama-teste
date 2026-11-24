import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { JwtService } from '@nestjs/jwt';
import { JWT_AUDIENCE, JWT_ISSUER } from '../src/auth/auth.types';
import { withTestApplication } from './support/test-application';

interface Cliente { id: string; nome: string; cnpj: string; cidade: string; uf: string; ativo: boolean; possuiColetas?: boolean }
interface ListResult { itens: Cliente[]; meta: { pagina: number; limite: number; total: number; totalPaginas: number } }

test('gestão de clientes com API e PostgreSQL', async (context) => withTestApplication(async ({ source, base, environment }) => {
  const [usuario] = await source.query("INSERT INTO usuarios (nome, email, senha_hash) VALUES ('Pessoa Fictícia', 'clientes@example.test', 'hash-exclusivo-de-fixture-sem-login') RETURNING id") as { id: string }[];
  const token = await new JwtService().signAsync({ sub: usuario.id }, { secret: environment.auth.secret, expiresIn: 3600, issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
  const request = (path = '', method = 'GET', body?: unknown) => fetch(`${base}/clientes${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const input = { nome: '  Horizonte   Fictício  ', cnpj: '00.000.000/0000-01', cidade: '  Cidade   Fictícia ', uf: 'sp' };
  let cliente: Cliente;

  await context.test('exige sessão e valida dados, UUID e filtros', async () => {
    assert.equal((await fetch(`${base}/clientes`)).status, 401);
    for (const body of [{ ...input, cnpj: 'abc' }, { ...input, ativo: 'false' }, { ...input, uf: 'XX' }, { ...input, nome: null }, { ...input, ativo: null }, { ...input, id: randomUUID() }]) assert.equal((await request('', 'POST', body)).status, 400);
    assert.equal((await request('/id-invalido')).status, 400);
    assert.equal((await request(`/${randomUUID()}`)).status, 404);
    for (const query of ['pagina=0', 'limite=101', 'ativo=0', 'ativo=', 'pagina=1.5', 'busca=a&busca=b', 'desconhecido=1', 'nome=a&nome=b', 'cidade=a&cidade=b', 'cnpj=abc', 'cnpj=123456789012345', 'cnpj=', `nome=${'a'.repeat(161)}`, `cidade=${'a'.repeat(121)}`]) assert.equal((await request(`?${query}`)).status, 400);
  });

  await context.test('cria normalizado e aplica ativo por padrão', async () => {
    const response = await request('', 'POST', input);
    assert.equal(response.status, 201);
    cliente = await response.json() as Cliente;
    assert.equal(cliente.nome, 'Horizonte Fictício');
    assert.equal(cliente.cidade, 'Cidade Fictícia');
    assert.equal(cliente.cnpj, '00000000000001');
    assert.equal(cliente.uf, 'SP');
    assert.equal(cliente.ativo, true);
  });

  await context.test('CNPJ duplicado e simultâneo recebe 409', async () => {
    assert.equal((await request('', 'POST', { ...input, cnpj: '00000000000001' })).status, 409);
    const other = { ...input, nome: 'Alfa Fictício', cnpj: '00000000000002' };
    const results = await Promise.all([request('', 'POST', other), request('', 'POST', other)]);
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  });

  await context.test('busca, filtros e paginação são executados na API', async () => {
    await request('', 'POST', { ...input, nome: 'Zeta Fictício', cnpj: '00000000000003', ativo: false });
    const first = await (await request('?pagina=1&limite=2')).json() as ListResult;
    assert.deepEqual(first.meta, { pagina: 1, limite: 2, total: 3, totalPaginas: 2 });
    assert.deepEqual(first.itens.map((item) => item.nome), ['Alfa Fictício', 'Horizonte Fictício']);
    const second = await (await request('?pagina=2&limite=2')).json() as ListResult;
    assert.equal(second.itens[0].nome, 'Zeta Fictício');
    const inactive = await (await request('?ativo=false&busca=zeta')).json() as ListResult;
    assert.equal(inactive.meta.total, 1);
    assert.equal(inactive.itens[0].ativo, false);
    const masked = await (await request('?busca=00.000.000%2F0000-01')).json() as ListResult;
    assert.equal(masked.itens[0].id, cliente.id);
    const city = await (await request('?busca=Cidade%20Fict%C3%ADcia&ativo=true')).json() as ListResult;
    assert.equal(city.meta.total, 2);
    const empty = await (await request('?busca=inexistente')).json() as ListResult;
    assert.equal(empty.meta.totalPaginas, 0);
    const outside = await (await request('?pagina=99&limite=2')).json() as ListResult;
    assert.equal(outside.meta.total, 3);
    assert.equal(outside.itens.length, 0);
    const combined = await (await request('?nome=horizonte&cnpj=00.000.000%2F0000-01&cidade=cidade&ativo=true&limite=1')).json() as ListResult;
    assert.equal(combined.meta.total, 1);
    assert.equal(combined.itens[0].id, cliente.id);
    for (const query of ['nome=Cidade', 'cidade=Horizonte', 'nome=Horizonte&cnpj=02', 'nome=Horizonte&cidade=Outra']) {
      assert.equal((await (await request(`?${query}`)).json() as ListResult).meta.total, 0, query);
    }
    assert.equal((await (await request('?cnpj=01')).json() as ListResult).itens[0].id, cliente.id);
  });

  await context.test('edição parcial preserva os demais campos e rejeita nulos', async () => {
    assert.equal((await request(`/${cliente.id}`, 'PATCH', { ativo: false })).status, 200);
    assert.equal((await request(`/${cliente.id}`, 'PATCH', { cidade: 'Outra Cidade Fictícia' })).status, 200);
    const updated = await (await request(`/${cliente.id}`)).json() as Cliente;
    assert.equal(updated.ativo, false);
    assert.equal(updated.nome, cliente.nome);
    for (const body of [{ nome: null }, { ativo: null }, {}, { cnpj: '00000000000002' }]) assert.equal((await request(`/${cliente.id}`, 'PATCH', body)).status, 'cnpj' in body ? 409 : 400);
    const responses = await Promise.all([request(`/${cliente.id}`, 'PATCH', { nome: 'Horizonte Atualizado Fictício' }), request(`/${cliente.id}`, 'PATCH', { cidade: 'Cidade Atualizada Fictícia' })]);
    assert.ok(responses.every((r) => r.status === 200));
    const concurrent = await (await request(`/${cliente.id}`)).json() as Cliente;
    assert.equal(concurrent.nome, 'Horizonte Atualizado Fictício');
    assert.equal(concurrent.cidade, 'Cidade Atualizada Fictícia');
  });

  await context.test('cliente vinculado só pode ser inativado, sem exclusão', async () => {
    await source.query("INSERT INTO coletas (cliente_id, numero_mtr, tipo_residuo, data_agendada) VALUES ($1, 'MTR-CLIENTE-TESTE', 'Resíduo fictício', '2026-11-23')", [cliente.id]);
    const detail = await (await request(`/${cliente.id}`)).json() as Cliente;
    assert.equal(detail.possuiColetas, true);
    const list = await (await request('?busca=Horizonte')).json() as ListResult;
    assert.equal(list.itens[0].possuiColetas, true);
    assert.equal((await request(`/${cliente.id}`, 'DELETE')).status, 409);
    assert.equal((await request(`/${cliente.id}`, 'PATCH', { ativo: true })).status, 200);
    assert.equal((await request(`/${cliente.id}`, 'PATCH', { ativo: false })).status, 200);
    assert.equal((await request(`/${cliente.id}`)).status, 200);
  });

  await context.test('exclui sem vínculo e trata inexistência', async () => {
    const list = await (await request('?busca=Zeta')).json() as ListResult;
    const id = list.itens[0].id;
    assert.equal((await request(`/${id}`, 'DELETE')).status, 204);
    assert.equal((await request(`/${id}`, 'DELETE')).status, 404);
    assert.equal((await request(`/${id}`, 'PATCH', { ativo: true })).status, 404);
    assert.equal((await request(`/${id}`)).status, 404);
  });

  await context.test('busca trata curingas SQL como texto literal', async () => {
    assert.equal((await (await request('?busca=%25')).json() as ListResult).meta.total, 0);
    await request('', 'POST', { ...input, nome: 'Cliente % Fictício', cidade: 'Cidade % Fictícia', cnpj: '00000000000004' });
    for (const field of ['busca', 'nome', 'cidade']) assert.equal((await (await request(`?${field}=%25`)).json() as ListResult).meta.total, 1);
  });
}));
