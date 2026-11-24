import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { JwtService } from '@nestjs/jwt';
import { JWT_AUDIENCE, JWT_ISSUER } from '../src/auth/auth.types';
import { withTestApplication } from './support/test-application';

interface Coleta { id: string; clienteId: string; cliente: { nome: string }; numeroMtr: string; tipoResiduo: string; status: string; pesoKg: string | null; dataAgendada: string; dataRealizada: string | null; dataCdf: string | null; valorReceita: string; valorDespesa: string; observacao: string | null }
interface Lista { itens: Coleta[]; meta: { pagina: number; limite: number; total: number; totalPaginas: number } }

test('gestão de coletas com API e PostgreSQL', async (context) => withTestApplication(async ({ source, base, environment }) => {
  const [usuario] = await source.query("INSERT INTO usuarios (nome, email, senha_hash) VALUES ('Pessoa Fictícia', 'coletas@example.test', 'fixture-sem-login') RETURNING id") as { id: string }[];
  const token = await new JwtService().signAsync({ sub: usuario.id }, { secret: environment.auth.secret, expiresIn: 3600, issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
  const request = (path = '', method = 'GET', body?: unknown) => fetch(`${base}/coletas${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const clientes = await source.query("INSERT INTO clientes (nome, cnpj, cidade, uf, ativo) VALUES ('Ativo Fictício', '00000000000001', 'Cidade Fictícia', 'SP', true), ('Inativo Fictício', '00000000000002', 'Cidade Fictícia', 'SP', false) RETURNING id, ativo") as { id: string; ativo: boolean }[];
  const ativo = clientes.find((c) => c.ativo)!.id;
  const inativo = clientes.find((c) => !c.ativo)!.id;
  const input = { clienteId: ativo, numeroMtr: '  mtr-001  ', tipoResiduo: '  Papel   reciclável ', dataAgendada: '2026-11-23', valorReceita: '123456789012.34', valorDespesa: '0.10' };
  const create = async (numeroMtr: string, extra: object = {}) => {
    const response = await request('', 'POST', { ...input, numeroMtr, ...extra });
    assert.equal(response.status, 201, await response.clone().text());
    return await response.json() as Coleta;
  };
  let coleta: Coleta;

  await context.test('protege rotas e rejeita datas impossíveis, decimais ambíguos e campos proibidos', async () => {
    assert.equal((await fetch(`${base}/coletas`)).status, 401);
    for (const extra of [{ status: 'Realizada' }, { pesoKg: '1' }, { dataCdf: '2026-11-23' }, { dataRealizada: '2026-11-23' }, { dataAgendada: '2026-02-29' }, { dataAgendada: '2026-04-31' }, { dataAgendada: '2026-11-23T12:00:00Z' }, { valorReceita: 10 }, { valorDespesa: '-1' }, { valorReceita: '1e3' }, { valorReceita: '1.001' }, { valorDespesa: '1000000000000.00' }, { valorReceita: null }, { clienteId: null }]) assert.equal((await request('', 'POST', { ...input, ...extra })).status, 400, JSON.stringify(extra));
    assert.equal((await request('/inválido')).status, 400);
    assert.equal((await request(`/${randomUUID()}`)).status, 404);
    for (const query of ['inicio=2026-02-30', 'inicio=2026-12-01&fim=2026-01-01', 'status=Outro', 'semCdf=1', 'limite=101', 'pagina=0', 'clienteId=abc', 'status=Agendada&status=Realizada', 'campo=1']) assert.equal((await request(`?${query}`)).status, 400, query);
  });
  await context.test('cria agendada, normaliza textos e preserva precisão decimal', async () => {
    coleta = await create(input.numeroMtr);
    assert.equal(coleta.numeroMtr, 'MTR-001');
    assert.equal(coleta.tipoResiduo, 'Papel reciclável');
    assert.equal(coleta.cliente.nome, 'Ativo Fictício');
    assert.equal(coleta.status, 'Agendada');
    assert.equal(coleta.pesoKg, null);
    assert.equal(coleta.dataRealizada, null);
    assert.equal(coleta.dataCdf, null);
    assert.equal(coleta.valorReceita, '123456789012.34');
    assert.equal(coleta.valorDespesa, '0.10');
    assert.equal(coleta.dataAgendada, '2026-11-23');
    const defaults = await create('MTR-DEFAULT', { valorReceita: undefined, valorDespesa: undefined, dataAgendada: '2024-02-29' });
    assert.equal(defaults.valorReceita, '0.00');
    assert.equal(defaults.valorDespesa, '0.00');
  });
  await context.test('unicidade de MTR também sob concorrência', async () => {
    assert.equal((await request('', 'POST', { ...input, numeroMtr: 'mtr-001' })).status, 409);
    const responses = await Promise.all([request('', 'POST', { ...input, numeroMtr: 'MTR-RACE' }), request('', 'POST', { ...input, numeroMtr: 'mtr-race' })]);
    assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
  });
  await context.test('exige cliente existente e ativo para novos vínculos', async () => {
    assert.equal((await request('', 'POST', { ...input, numeroMtr: 'MTR-INATIVO', clienteId: inativo })).status, 400);
    assert.equal((await request('', 'POST', { ...input, clienteId: randomUUID() })).status, 404);
    assert.equal((await request(`/${coleta.id}`, 'PATCH', { clienteId: inativo })).status, 400);
    assert.equal((await request(`/${coleta.id}`, 'PATCH', {})).status, 400);
    assert.equal((await request(`/${coleta.id}`, 'PATCH', { observacao: null })).status, 400);
    // A criação aguarda o bloqueio usado pela inativação e reavalia o estado após o commit.
    const runner = source.createQueryRunner();
    await runner.connect(); await runner.startTransaction();
    try {
      await runner.query('UPDATE clientes SET ativo = false WHERE id = $1', [ativo]);
      const pending = request('', 'POST', { ...input, numeroMtr: 'MTR-LOCK' });
      await runner.commitTransaction();
      assert.equal((await pending).status, 400);
      assert.equal((await request(`/${coleta.id}`, 'PATCH', { observacao: 'Vínculo histórico preservado.' })).status, 200);
    } finally { if (runner.isTransactionActive) await runner.rollbackTransaction(); await runner.release(); await source.query('UPDATE clientes SET ativo = true WHERE id = $1', [ativo]); }
  });
  await context.test('realização exige peso positivo e data civil; cliente inativo preserva o fluxo existente', async () => {
    for (const extra of [{ pesoKg: '0' }, { pesoKg: '0.000' }, { pesoKg: '-1' }, { pesoKg: '1.0001' }, { pesoKg: 1 }, { pesoKg: '100000000000' }, { dataRealizada: '2026-02-30' }, { dataRealizada: null }]) assert.equal((await request(`/${coleta.id}/realizar`, 'PATCH', { pesoKg: '123.456', dataRealizada: '2026-11-24', ...extra })).status, 400);
    assert.equal((await request(`/${coleta.id}/cdf`, 'PATCH', { dataCdf: '2026-11-24' })).status, 400);
    await source.query('UPDATE clientes SET ativo = false WHERE id = $1', [ativo]);
    const response = await request(`/${coleta.id}/realizar`, 'PATCH', { pesoKg: '123.456', dataRealizada: '2026-11-24' });
    assert.equal(response.status, 200);
    coleta = await response.json() as Coleta;
    assert.equal(coleta.pesoKg, '123.456');
    assert.equal(coleta.dataRealizada, '2026-11-24');
    await source.query('UPDATE clientes SET ativo = true WHERE id = $1', [ativo]);
  });
  await context.test('estados finais são preservados e CDF respeita a data de realização', async () => {
    assert.equal((await request(`/${coleta.id}/cancelar`, 'PATCH', {})).status, 409);
    assert.equal((await request(`/${coleta.id}/realizar`, 'PATCH', { pesoKg: '1', dataRealizada: '2026-11-24' })).status, 409);
    assert.equal((await request(`/${coleta.id}`, 'PATCH', { valorReceita: '0' })).status, 409);
    assert.equal((await request(`/${coleta.id}`, 'DELETE')).status, 409);
    assert.equal((await request(`/${coleta.id}`, 'PATCH', { observacao: 'Documento conferido.' })).status, 200);
    assert.equal((await request(`/${coleta.id}/cdf`, 'PATCH', { dataCdf: '2026-11-23' })).status, 400);
    for (const dataCdf of ['2026-11-24', '2026-11-25']) {
      const response = await request(`/${coleta.id}/cdf`, 'PATCH', { dataCdf });
      assert.equal(response.status, 200);
      assert.equal((await response.json() as Coleta).dataCdf, dataCdf);
    }
    assert.equal((await request(`/${coleta.id}/cdf`, 'PATCH', { dataCdf: null })).status, 400);
  });
  await context.test('realizar e cancelar concorrentes têm exatamente um vencedor', async () => {
    const racing = await create('MTR-FINAL-RACE');
    const responses = await Promise.all([request(`/${racing.id}/realizar`, 'PATCH', { pesoKg: '0.001', dataRealizada: '2026-11-24' }), request(`/${racing.id}/cancelar`, 'PATCH', {})]);
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
    const current = await (await request(`/${racing.id}`)).json() as Coleta;
    assert.ok(['Realizada', 'Cancelada'].includes(current.status));
    assert.equal(current.pesoKg, current.status === 'Realizada' ? '0.001' : null);
  });
  await context.test('cancelamento rejeita campos, não recebe CDF e não é apagado', async () => {
    const cancel = await create('MTR-CANCEL');
    assert.equal((await request(`/${cancel.id}/cancelar`, 'PATCH', { pesoKg: '1' })).status, 400);
    assert.equal((await request(`/${cancel.id}/cancelar`, 'PATCH', {})).status, 200);
    assert.equal((await request(`/${cancel.id}/cdf`, 'PATCH', { dataCdf: '2026-11-24' })).status, 400);
    assert.equal((await request(`/${cancel.id}`, 'DELETE')).status, 409);
  });
  await context.test('filtra na API, pagina com total real e distingue sem CDF de pendência', async () => {
    const filtered = await (await request(`?clienteId=${ativo}&status=Realizada&tipoResiduo=Papel%20recicl%C3%A1vel&inicio=2026-11-23&fim=2026-11-23&semCdf=false&limite=1`)).json() as Lista;
    assert.equal(filtered.meta.total, 1);
    assert.equal(filtered.itens[0].id, coleta.id);
    const absent = await (await request('?semCdf=true&limite=1')).json() as Lista;
    assert.ok(absent.meta.total >= 4);
    assert.equal(absent.itens.length, 1);
    const pending = await (await request('?semCdf=true&status=Realizada')).json() as Lista;
    assert.ok(pending.itens.every((item) => item.status === 'Realizada' && item.dataCdf === null));
    const outside = await (await request('?pagina=99999')).json() as Lista;
    assert.equal(outside.itens.length, 0);
    assert.ok(outside.meta.total > 0);
    const residues = await (await request('/residuos?busca=Papel')).json() as { itens: string[] };
    assert.deepEqual(residues.itens, ['Papel reciclável']);
    assert.deepEqual((await (await request('/residuos?busca=%25')).json() as { itens: string[] }).itens, []);
  });
  await context.test('permite editar e excluir somente agendadas e trata ausência', async () => {
    const draft = await create('MTR-DELETE');
    const response = await request(`/${draft.id}`, 'PATCH', { numeroMtr: 'mtr-editado', tipoResiduo: 'Metal', valorReceita: '10.20' });
    assert.equal(response.status, 200);
    const updated = await response.json() as Coleta;
    assert.equal(updated.numeroMtr, 'MTR-EDITADO');
    assert.equal(updated.valorDespesa, input.valorDespesa);
    assert.equal((await request(`/${draft.id}`, 'DELETE')).status, 204);
    for (const action of ['', '/cancelar', '/realizar', '/cdf']) {
      const body = action === '/realizar' ? { pesoKg: '1', dataRealizada: '2026-11-24' } : action === '/cdf' ? { dataCdf: '2026-11-24' } : {};
      assert.equal((await request(`/${draft.id}${action}`, 'PATCH', body)).status, action === '' ? 400 : 404);
    }
    assert.equal((await request(`/${draft.id}`)).status, 404);
    assert.equal((await request(`/${draft.id}`, 'DELETE')).status, 404);
  });
}));
