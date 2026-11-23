import dataSource from './data-source';

async function check(): Promise<void> {
  try {
    await dataSource.initialize();
    await dataSource.query('SELECT 1');
    const pending = await dataSource.showMigrations();
    console.log(pending ? 'Banco conectado. Há migrations pendentes.' : 'Banco conectado. Migrations em dia.');
    if (pending) process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

void check().catch(() => {
  console.error('Não foi possível verificar o banco. Confira a configuração, o serviço e as migrations.');
  process.exitCode = 1;
});
