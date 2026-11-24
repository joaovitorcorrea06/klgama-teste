import { hash } from 'bcryptjs';
import { DataSource } from 'typeorm';
import { resolvePeriodo } from '../painel/painel.service';

const USER_ID = 'e0000000-0000-4000-8000-000000000001';
const clientes = [
  ['e0000000-0000-4000-8000-000000000011', 'Indústria Aurora Fictícia', '00000000009001', 'Cidade Exemplo', 'SP'],
  ['e0000000-0000-4000-8000-000000000012', 'Metalúrgica Vale Fictícia', '00000000009002', 'Vila Modelo', 'MG'],
  ['e0000000-0000-4000-8000-000000000013', 'Alimentos Horizonte Fictícia', '00000000009003', 'Porto Exemplo', 'PR'],
  ['e0000000-0000-4000-8000-000000000014', 'Distribuidora Campo Fictícia', '00000000009004', 'Cidade Modelo', 'SC'],
];
const tipos = ['Papel e papelão', 'Plástico', 'Metal', 'Resíduo orgânico'];
const money = (cents: number) => `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;

export async function seedDemo(source: DataSource, now = new Date()): Promise<{ inicio: string; fim: string; coletasInseridas: number }> {
  const { inicio, fim } = resolvePeriodo({}, now);
  const senhaHash = await hash('EcoColetaDemo2026!', 12);
  return source.transaction(async manager => {
    // IDs reservados à demonstração: não atualizar contas nem dados já existentes.
    await manager.query(`INSERT INTO usuarios (id, nome, email, senha_hash) VALUES ($1, 'Gestão Demonstração Fictícia', 'demo@ecocoleta.example', $2) ON CONFLICT (id) DO NOTHING`, [USER_ID, senhaHash]);
    for (const cliente of clientes) await manager.query('INSERT INTO clientes (id, nome, cnpj, cidade, uf) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING', cliente);
    const start = Number(inicio.slice(0, 4)) * 12 + Number(inicio.slice(5)) - 1;
    let coletasInseridas = 0;
    for (let m = 0; m < 12; m++) {
      const position = start + m;
      const month = `${Math.floor(position / 12)}-${String(position % 12 + 1).padStart(2, '0')}`;
      for (let j = 0; j < 8; j++) {
        const day = 2 + j * 3;
        const date = (value: number) => `${month}-${String(value).padStart(2, '0')}`;
        const realizada = j < 6;
        const factor = (m * 17 + j * 11) % 23;
        const receita = 100000 + m * 20000 + j * 12000 + factor * 1250;
        const despesa = 45000 + m * 9500 + j * 6250 + factor * 700;
        const [inserted] = await manager.query(`INSERT INTO coletas
          (cliente_id, numero_mtr, tipo_residuo, peso_kg, valor_receita, valor_despesa, data_agendada, data_realizada, data_cdf, status, observacao)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Registro inteiramente fictício gerado para demonstração.')
          ON CONFLICT (numero_mtr) DO NOTHING RETURNING id`, [clientes[(m + j) % clientes.length][0], `DEMO-${month}-${String(j + 1).padStart(2, '0')}`, tipos[(m + j) % tipos.length], realizada ? `${2000 + m * 125 + j * 800}.${String(factor * 37).padStart(3, '0')}` : null, money(receita), money(despesa), date(day), realizada ? date(day + 2) : null, realizada && j % 3 !== 0 ? date(day + 5) : null, realizada ? 'Realizada' : j === 6 ? 'Agendada' : 'Cancelada']) as { id: string }[];
        if (inserted) coletasInseridas++;
      }
    }
    return { inicio, fim, coletasInseridas };
  });
}
