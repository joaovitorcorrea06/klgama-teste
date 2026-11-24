import { config } from 'dotenv';
import { resolve } from 'node:path';

// Funciona no CLI, no código compilado e quando o workspace é iniciado pela raiz.
config({ path: resolve(__dirname, '../../../../.env'), quiet: true });

export interface Environment {
  nodeEnv: 'development' | 'test' | 'production';
  apiPort: number;
  webOrigin: string;
  trustProxy: boolean;
  swagger: { enabled: boolean; user: string; password: string };
  auth: { secret: string; expiresIn: number; cookieSecure: boolean };
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
  const secret = required('JWT_SECRET');
  if (Buffer.byteLength(secret, 'utf8') < 32 || secret.startsWith('replace-')) {
    throw new Error('JWT_SECRET deve ser um segredo aleatório com pelo menos 32 bytes.');
  }
  const duration = /^(\d+)(s|m|h)$/.exec(source.JWT_EXPIRES_IN ?? '1h');
  const expiresIn = duration ? Number(duration[1]) * ({ s: 1, m: 60, h: 3600 }[duration[2]] ?? 0) : 0;
  if (expiresIn < 60 || expiresIn > 86400) throw new Error('JWT_EXPIRES_IN deve ser de 60 segundos a 24 horas, usando s, m ou h.');
  const cookieSecure = source.COOKIE_SECURE ?? 'false';
  const trustProxy = source.API_TRUST_PROXY ?? 'false';
  if (!['true', 'false'].includes(cookieSecure)) throw new Error('COOKIE_SECURE deve ser true ou false.');
  if (!['true', 'false'].includes(trustProxy)) throw new Error('API_TRUST_PROXY deve ser true ou false.');
  if (origin.protocol === 'https:' && cookieSecure !== 'true') throw new Error('COOKIE_SECURE deve ser true quando WEB_ORIGIN usa HTTPS.');
  const swaggerEnabled = source.SWAGGER_ENABLED ?? 'false';
  if (!['true', 'false'].includes(swaggerEnabled)) throw new Error('SWAGGER_ENABLED deve ser true ou false.');
  const swaggerUser = source.SWAGGER_USER?.trim() ?? '';
  const swaggerPassword = source.SWAGGER_PASSWORD ?? '';
  if (swaggerEnabled === 'true' && (!/^[a-zA-Z0-9_-]{3,80}$/.test(swaggerUser) || Buffer.byteLength(swaggerPassword) < 16 || swaggerPassword.startsWith('replace-'))) {
    throw new Error('Swagger habilitado exige SWAGGER_USER válido e SWAGGER_PASSWORD próprio com pelo menos 16 bytes. Execute npm run setup após habilitar.');
  }

  return {
    nodeEnv,
    apiPort: port('API_PORT', '3000'),
    webOrigin,
    trustProxy: trustProxy === 'true',
    swagger: { enabled: swaggerEnabled === 'true', user: swaggerUser, password: swaggerPassword },
    auth: { secret, expiresIn, cookieSecure: cookieSecure === 'true' },
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
