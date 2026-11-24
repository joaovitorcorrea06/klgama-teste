import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const target = fileURLToPath(new URL('../.env', import.meta.url));
let content = readFileSync(existsSync(target) ? target : new URL('../.env.example', import.meta.url), 'utf8');
const match = /^JWT_SECRET=(.*)$/m.exec(content);
if (!match || !match[1].trim() || match[1].startsWith('replace-')) {
  const line = `JWT_SECRET=${randomBytes(48).toString('hex')}`;
  content = match ? content.replace(/^JWT_SECRET=.*$/m, line) : `${content}\n${line}\n`;
}
for (const [name, fallback] of Object.entries({ SWAGGER_ENABLED: 'false', SWAGGER_USER: 'avaliacao', SWAGGER_PASSWORD: 'replace-with-a-separate-documentation-password' })) {
  if (!new RegExp(`^${name}=`, 'm').test(content)) content += `\n${name}=${fallback}\n`;
}
if (/^SWAGGER_ENABLED=true\s*$/m.test(content)) {
  const password = /^SWAGGER_PASSWORD=(.*)$/m.exec(content)?.[1] ?? '';
  if (!password.trim() || password.startsWith('replace-')) content = content.replace(/^SWAGGER_PASSWORD=.*$/m, `SWAGGER_PASSWORD=${randomBytes(32).toString('hex')}`);
}
writeFileSync(target, content, { mode: 0o600 });
chmodSync(target, 0o600);
console.log('Ambiente local preparado. Valores existentes preservados; segredos de exemplo substituídos quando necessário.');
