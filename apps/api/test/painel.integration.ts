import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JwtService } from '@nestjs/jwt';
import { JWT_AUDIENCE, JWT_ISSUER } from '../src/auth/auth.types';
import { resolvePeriodo } from '../src/painel/painel.service';
import { withTestApplication } from './support/test-application';
import { seedDemo } from '../src/database/demo-data';

interface Painel {
  periodo: { inicio: string; fim: string; meses: number };
  indicadores: { emitidos: number; mediaMensalMtr: string; comCdf: number; semCdf: number; percentualComCdf: string; percentualSemCdf: string; receita: string; despesa: string; saldo: string; toneladas: string };
  financeiroMensal: { mes: string; receita: string; despesa: string; saldo: string }[];
  rastreabilidadeMensal: { mes: string; comCdf: number; semCdf: number }[];
  composicaoResiduos: { tipoResiduo: string; toneladas: string; percentual: string }[];
  evolucaoMensal: { mes: string; toneladas: string; receita: string; despesa: string }[];
  atencao: { total: number; itens: { id: string; dataRealizada: string; numeroMtr: string }[] };
}
test('painel com agregações PostgreSQL e bases temporais distintas', async (context) => withTestApplication(async ({ source, base, environment }) => {
  const [usuario] = await source.query("INSERT INTO usuarios (nome, email, senha_hash) VALUES ('Pessoa Fictícia', 'painel@example.test', 'fixture-sem-login') RETURNING id") as { id: string }[];
  const token = await new JwtService().signAsync({ sub: usuario.id }, { secret: environment.auth.secret, expiresIn: 3600, issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
  const request = (query = '') => fetch(`${base}/painel${query}`, { headers: { Authorization: `Bearer ${token}` } });
  const get = async (query: string): Promise<Painel> => {
    const response = await request(query); assert.equal(response.status, 200, await response.clone().text());
    return response.json() as Promise<Painel>;
  };
  await context.test('protege endpoint e valida meses e limite de 60 meses', async () => {
    assert.equal((await fetch(`${base}/painel`)).status, 401);
    for (const query of ['inicio=2026-13', 'inicio=2026-01-01', 'inicio=2026-02&fim=2026-01', 'inicio=2020-01&fim=2026-01', 'inicio=2026-01&inicio=2026-02', 'campo=1']) assert.equal((await request(`?${query}`)).status, 400, query);
    const sixty = await get('?inicio=2021-01&fim=2025-12');
    assert.equal(sixty.periodo.meses, 60);
    assert.equal(sixty.financeiroMensal.length, 60);
  });
  await context.test('banco vazio produz meses zerados sem NaN ou divisão por zero', async () => {
    const data = await get('?inicio=2026-01&fim=2026-03');
    assert.equal(data.indicadores.emitidos, 0);
    for (const key of ['mediaMensalMtr', 'percentualComCdf', 'percentualSemCdf', 'receita', 'despesa', 'saldo', 'toneladas'] as const) assert.equal(Number(data.indicadores[key]), 0);
    assert.deepEqual(data.rastreabilidadeMensal, ['2026-01', '2026-02', '2026-03'].map(mes => ({ mes, comCdf: 0, semCdf: 0 })));
    assert.deepEqual(data.composicaoResiduos, []);
    assert.deepEqual(data.atencao, { total: 0, itens: [] });
  });
  const [cliente] = await source.query("INSERT INTO clientes (nome, cnpj, cidade, uf) VALUES ('Operação Fictícia', '00000000000001', 'Cidade Exemplo', 'SP') RETURNING id") as { id: string }[];
  // Janeiro agenda; fevereiro realiza. CDF recebido em abril altera o documento de janeiro.
  await source.query(`INSERT INTO coletas (cliente_id, numero_mtr, tipo_residuo, data_agendada, status, peso_kg, data_realizada, data_cdf, valor_receita, valor_despesa) VALUES
    ($1, 'MTR-CRUZADO', 'Papel', '2026-01-10', 'Realizada', 1000.125, '2026-02-03', '2026-04-01', 0.10, 0.20),
    ($1, 'MTR-REALIZADA', 'Metal', '2026-02-01', 'Realizada', 2000.875, '2026-02-28', NULL, 100.20, 40.10),
    ($1, 'MTR-AGENDADA', 'Papel', '2026-01-31', 'Agendada', NULL, NULL, NULL, 9999, 8888),
    ($1, 'MTR-CANCELADA', 'Metal', '2026-02-15', 'Cancelada', NULL, NULL, NULL, 9999, 8888),
    ($1, 'MTR-ANTIGA', 'Metal', '2025-01-01', 'Realizada', 300, '2025-01-02', NULL, 5000, 4000),
    ($1, 'MTR-LIMITE', 'Metal', '2026-04-01', 'Agendada', NULL, NULL, NULL, 0, 0)`, [cliente.id]);
  await context.test('financeiro usa realização e soma decimais sem erro de ponto flutuante', async () => {
    const data = await get('?inicio=2026-01&fim=2026-03');
    assert.equal(data.indicadores.receita, '100.30');
    assert.equal(data.indicadores.despesa, '40.30');
    assert.equal(data.indicadores.saldo, '60.00');
    assert.equal(Number(data.indicadores.toneladas), 3.001);
    assert.deepEqual(data.financeiroMensal[1], { mes: '2026-02', receita: '100.30', despesa: '40.30', saldo: '60.00' });
    assert.equal(Number(data.financeiroMensal[0].receita), 0);
    assert.equal(Number(data.financeiroMensal[2].receita), 0);
    assert.equal(Number(data.evolucaoMensal[1].toneladas), 3.001);
    const january = await get('?inicio=2026-01&fim=2026-01');
    assert.equal(Number(january.indicadores.receita), 0);
    assert.equal(january.indicadores.emitidos, 2);
  });
  await context.test('MTR segue agendamento, exclui canceladas e considera o CDF atual', async () => {
    const data = await get('?inicio=2026-01&fim=2026-03');
    assert.equal(data.indicadores.emitidos, 3);
    assert.equal(data.indicadores.comCdf, 1);
    assert.equal(data.indicadores.semCdf, 2);
    assert.equal(Number(data.indicadores.mediaMensalMtr), 1);
    assert.ok(Math.abs(Number(data.indicadores.percentualComCdf) - 100 / 3) < 1e-12);
    assert.deepEqual(data.rastreabilidadeMensal, [{ mes: '2026-01', comCdf: 1, semCdf: 1 }, { mes: '2026-02', comCdf: 0, semCdf: 1 }, { mes: '2026-03', comCdf: 0, semCdf: 0 }]);
    assert.deepEqual(data.composicaoResiduos.map(r => r.tipoResiduo), ['Metal', 'Papel']);
    assert.equal(Number(data.composicaoResiduos[0].toneladas), 2.000875);
  });
  await context.test('atenção ignora período, exclui agendadas e sai após registrar CDF', async () => {
    const data = await get('?inicio=2030-01&fim=2030-02');
    assert.equal(data.indicadores.emitidos, 0);
    assert.equal(data.atencao.total, 2);
    assert.deepEqual(data.atencao.itens.map(r => r.numeroMtr), ['MTR-ANTIGA', 'MTR-REALIZADA']);
    await source.query("UPDATE coletas SET data_cdf = '2026-11-24' WHERE numero_mtr = 'MTR-ANTIGA'");
    const updated = await get('?inicio=2030-01&fim=2030-02');
    assert.equal(updated.atencao.total, 1);
  });
  await context.test('atenção limita cinco itens com total independente e desempate por UUID', async () => {
    await source.query(`INSERT INTO coletas (cliente_id, numero_mtr, tipo_residuo, data_agendada, status, peso_kg, data_realizada)
      SELECT $1, 'MTR-PENDENTE-' || n, 'Papel', '2024-01-01', 'Realizada', 1, '2024-01-02' FROM generate_series(1, 7) n`, [cliente.id]);
    const data = await get('?inicio=2026-01&fim=2026-03');
    assert.equal(data.atencao.total, 8);
    assert.equal(data.atencao.itens.length, 5);
    assert.deepEqual(data.atencao.itens.map(i => i.id), data.atencao.itens.map(i => i.id).sort());
  });
}));

test('período padrão usa calendário de São Paulo na virada do mês', () => {
  const period = resolvePeriodo({}, new Date('2026-03-01T01:00:00Z'));
  assert.equal(period.fim, '2026-02'); assert.equal(period.inicio, '2025-03'); assert.equal(period.meses, 12);
  assert.equal(resolvePeriodo({ fim: '2020-12' }).inicio, '2020-01');
});

test('demonstração cobre doze meses e não sobrescreve registros em nova execução', async () => withTestApplication(async ({ source }) => {
  const now = new Date('2026-11-24T12:00:00Z');
  assert.equal((await seedDemo(source, now)).coletasInseridas, 96);
  await source.query("UPDATE coletas SET observacao = 'Correção preservada.' WHERE numero_mtr = 'DEMO-2026-11-01'");
  assert.equal((await seedDemo(source, now)).coletasInseridas, 0);
  const [result] = await source.query("SELECT count(*)::int AS total, count(DISTINCT date_trunc('month', data_agendada))::int AS meses FROM coletas") as { total: number; meses: number }[];
  assert.deepEqual(result, { total: 96, meses: 12 });
  const [changed] = await source.query("SELECT observacao FROM coletas WHERE numero_mtr = 'DEMO-2026-11-01'") as { observacao: string }[];
  assert.equal(changed.observacao, 'Correção preservada.');
}));
