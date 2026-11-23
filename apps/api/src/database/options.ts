import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';
import type { Environment } from '../config/environment';

export function databaseOptions(environment: Environment): Extract<DataSourceOptions, { type: 'postgres' }> {
  return {
    type: 'postgres',
    ...environment.database,
    entities: [join(__dirname, '../**/*.entity.{js,ts}')],
    migrations: [join(__dirname, 'migrations/*.{js,ts}')],
    migrationsTableName: 'migrations',
    synchronize: false,
    migrationsRun: false,
    logging: false,
    connectTimeoutMS: 5000,
    extra: { max: 10, idleTimeoutMillis: 30000, statement_timeout: 10000 },
  };
}
