import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { readEnvironment } from '../src/config/environment';
import { databaseOptions } from '../src/database/options';

test('migration cria, protege e reverte o esquema em banco isolado', async () => {
  const environment = readEnvironment();
  if (environment.nodeEnv === 'production') throw new Error('Teste de banco proibido em produção.');
  const database = `ecocoleta_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new Client({
    host: environment.database.host, port: environment.database.port,
    user: environment.database.username, password: environment.database.password,
    database: environment.database.database, ssl: environment.database.ssl,
  });
  const source = new DataSource({ ...databaseOptions(environment), database });
  await admin.connect();
  let created = false;
  try {
    await admin.query(`CREATE DATABASE "${database}"`);
    created = true;
    await source.initialize();
    assert.equal((await source.runMigrations()).length, 1);
    assert.equal((await source.runMigrations()).length, 0);
    const [cliente] = await source.query("INSERT INTO clientes (nome, cnpj, cidade, uf) VALUES ('Cliente Fictício', '00000000000000', 'Cidade Fictícia', 'SP') RETURNING id") as { id: string }[];
    const [coleta] = await source.query("INSERT INTO coletas (cliente_id, numero_mtr, tipo_residuo, data_agendada) VALUES ($1, 'MTR-TESTE', 'Resíduo fictício', '2026-01-10') RETURNING id, status, peso_kg, data_cdf", [cliente.id]) as { id: string; status: string; peso_kg: string | null; data_cdf: string | null }[];
    assert.equal(coleta.status, 'Agendada');
    assert.equal(coleta.peso_kg, null);
    assert.equal(coleta.data_cdf, null);
    const rejects = async (sql: string, params: unknown[], expectedCode: string): Promise<void> => {
      await assert.rejects(source.query(sql, params), (error: unknown) =>
        typeof error === 'object' && error !== null && 'code' in error && error.code === expectedCode);
    };
    await rejects("INSERT INTO clientes (nome, cnpj, cidade, uf) VALUES ('Outro Cliente', '00000000000000', 'Outra Cidade', 'SP')", [], '23505');
    await rejects('DELETE FROM clientes WHERE id = $1', [cliente.id], '23503');
    await rejects("UPDATE coletas SET status = 'Realizada' WHERE id = $1", [coleta.id], '23514');
    await rejects("UPDATE coletas SET data_cdf = '2026-01-11' WHERE id = $1", [coleta.id], '23514');
    await rejects('UPDATE coletas SET valor_receita = -1 WHERE id = $1', [coleta.id], '23514');
    await rejects("UPDATE coletas SET valor_receita = 'NaN' WHERE id = $1", [coleta.id], '23514');
    await source.query("UPDATE coletas SET status = 'Realizada', peso_kg = 1234.567, data_realizada = '2026-01-12', valor_receita = 0.10, valor_despesa = 0.20 WHERE id = $1", [coleta.id]);
    await rejects("UPDATE coletas SET data_cdf = '2026-01-11' WHERE id = $1", [coleta.id], '23514');
    await source.query("UPDATE coletas SET data_cdf = '2026-01-12' WHERE id = $1", [coleta.id]);
    const [saldo] = await source.query('SELECT (valor_receita - valor_despesa)::text AS valor FROM coletas WHERE id = $1', [coleta.id]) as { valor: string }[];
    assert.equal(saldo.valor, '-0.10');
    await source.undoLastMigration();
    const [result] = await source.query("SELECT to_regclass('public.coletas') AS tabela") as { tabela: string | null }[];
    assert.equal(result.tabela, null);
    assert.equal((await source.runMigrations()).length, 1);
  } finally {
    if (source.isInitialized) await source.destroy();
    if (created) await admin.query(`DROP DATABASE "${database}"`);
    await admin.end();
  }
});
