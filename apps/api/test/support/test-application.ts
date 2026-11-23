import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/config/configure-app';
import { readEnvironment } from '../../src/config/environment';
import { databaseOptions } from '../../src/database/options';

export async function withTestApplication(run: (context: { source: DataSource; base: string; environment: ReturnType<typeof readEnvironment> }) => Promise<void>): Promise<void> {
  const environment = readEnvironment();
  if (environment.nodeEnv === 'production') throw new Error('Teste proibido em produção.');
  const originalDatabase = process.env.DB_NAME;
  const database = `ecocoleta_it_${randomUUID().replaceAll('-', '')}`;
  const admin = new Client({ host: environment.database.host, port: environment.database.port, user: environment.database.username, password: environment.database.password, database: environment.database.database, ssl: environment.database.ssl });
  const source = new DataSource({ ...databaseOptions(environment), database });
  let app: INestApplication | undefined;
  let created = false;
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${database}"`);
    created = true;
    process.env.DB_NAME = database;
    await source.initialize();
    await source.runMigrations();
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    await run({ source, base: await app.getUrl(), environment });
  } finally {
    try { await app?.close(); }
    finally {
      if (source.isInitialized) await source.destroy();
      if (originalDatabase === undefined) delete process.env.DB_NAME;
      else process.env.DB_NAME = originalDatabase;
      try { if (created) await admin.query(`DROP DATABASE "${database}"`); }
      finally { await admin.end(); }
    }
  }
}
