import dataSource from './data-source';
import { readEnvironment } from '../config/environment';
import { seedDemo } from './demo-data';

async function run(): Promise<void> {
  if (readEnvironment().nodeEnv === 'production') throw new Error('Dados de demonstração não podem ser gerados em produção.');
  try {
    await dataSource.initialize();
    if (await dataSource.showMigrations()) throw new Error('Aplique as migrations antes de gerar a demonstração.');
    const result = await seedDemo(dataSource);
    console.log(`${result.coletasInseridas} coletas fictícias inseridas entre ${result.inicio} e ${result.fim}. Registros existentes foram preservados.`);
    console.log('Conta local de demonstração: demo@ecocoleta.example. Senha de demonstração documentada no README.');
  } finally { if (dataSource.isInitialized) await dataSource.destroy(); }
}
void run().catch((error: unknown) => { console.error(error instanceof Error && !(error && 'query' in error) ? error.message : 'Não foi possível preparar a demonstração. Verifique o banco e eventuais conflitos com registros existentes.'); process.exitCode = 1; });
