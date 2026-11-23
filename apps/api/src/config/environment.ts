import { config } from 'dotenv';
import { resolve } from 'node:path';

// Funciona no CLI, no código compilado e quando o workspace é iniciado pela raiz.
config({ path: resolve(__dirname, '../../../../.env'), quiet: true });

export interface Environment {
  nodeEnv: 'development' | 'test' | 'production';
  apiPort: number;
  webOrigin: string;
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: false | { rejectUnauthorized: true };
  };
}

export function readEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const required = (name: string): string => {
    const value = source[name]?.trim();
    if (!value) throw new Error(`Configuração obrigatória ausente: ${name}. Confira o .env.`);
    return value;
  };
  const port = (name: string, fallback: string): number => {
    const raw = source[name] ?? fallback;
    if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > 65535) {
      throw new Error(`Configuração inválida: ${name} deve ser uma porta entre 1 e 65535.`);
    }
    return Number(raw);
  };

  const nodeEnv = source.NODE_ENV ?? 'development';
  if (nodeEnv !== 'development' && nodeEnv !== 'test' && nodeEnv !== 'production') {
    throw new Error('Configuração inválida: NODE_ENV.');
  }

  const webOrigin = required('WEB_ORIGIN');
  let origin: URL;
  try { origin = new URL(webOrigin); } catch { throw new Error('Configuração inválida: WEB_ORIGIN.'); }
  if (!['http:', 'https:'].includes(origin.protocol) || origin.origin !== webOrigin) {
    throw new Error('WEB_ORIGIN deve conter somente a origem HTTP ou HTTPS, sem caminho ou barra final.');
  }

  const ssl = source.DB_SSL ?? 'false';
  if (ssl !== 'true' && ssl !== 'false') throw new Error('DB_SSL deve ser true ou false.');

  return {
    nodeEnv,
    apiPort: port('API_PORT', '3000'),
    webOrigin,
    database: {
      host: required('DB_HOST'),
      port: port('DB_PORT', '5432'),
      database: required('DB_NAME'),
      username: required('DB_USER'),
      password: required('DB_PASSWORD'),
      ssl: ssl === 'true' ? { rejectUnauthorized: true } : false,
    },
  };
}
