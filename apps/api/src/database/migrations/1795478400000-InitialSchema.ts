import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1795478400000 implements MigrationInterface {
  name = 'InitialSchema1795478400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE usuarios (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        nome text NOT NULL CHECK (length(btrim(nome)) BETWEEN 2 AND 120),
        email text NOT NULL,
        senha_hash text NOT NULL,
        criado_em timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT usuarios_email_key UNIQUE (email),
        CONSTRAINT usuarios_email_normalizado CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 254)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE clientes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        nome text NOT NULL CHECK (length(btrim(nome)) BETWEEN 2 AND 160),
        cnpj text NOT NULL,
        cidade text NOT NULL CHECK (length(btrim(cidade)) BETWEEN 2 AND 120),
        uf text NOT NULL CHECK (uf IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
        ativo boolean NOT NULL DEFAULT true,
        criado_em timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT clientes_cnpj_key UNIQUE (cnpj),
        CONSTRAINT clientes_cnpj_formato CHECK (cnpj ~ '^[0-9]{14}$')
      )
    `);
    await queryRunner.query(`
      CREATE TABLE coletas (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        cliente_id uuid NOT NULL,
        numero_mtr text NOT NULL,
        tipo_residuo text NOT NULL CHECK (length(btrim(tipo_residuo)) BETWEEN 2 AND 160),
        peso_kg numeric(14,3),
        valor_receita numeric(14,2) NOT NULL DEFAULT 0,
        valor_despesa numeric(14,2) NOT NULL DEFAULT 0,
        data_agendada date NOT NULL,
        data_realizada date,
        data_cdf date,
        status text NOT NULL DEFAULT 'Agendada',
        observacao text CHECK (length(observacao) <= 2000),
        criado_em timestamptz NOT NULL DEFAULT now(),
        atualizado_em timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT coletas_cliente_fk FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
        CONSTRAINT coletas_numero_mtr_key UNIQUE (numero_mtr),
        CONSTRAINT coletas_mtr_normalizado CHECK (numero_mtr = upper(btrim(numero_mtr)) AND length(numero_mtr) BETWEEN 1 AND 80),
        CONSTRAINT coletas_status_valido CHECK (status IN ('Agendada', 'Realizada', 'Cancelada')),
        CONSTRAINT coletas_receita_valida CHECK (valor_receita >= 0 AND valor_receita <> 'NaN'::numeric),
        CONSTRAINT coletas_despesa_valida CHECK (valor_despesa >= 0 AND valor_despesa <> 'NaN'::numeric),
        CONSTRAINT coletas_peso_valido CHECK (peso_kg IS NULL OR (peso_kg > 0 AND peso_kg <> 'NaN'::numeric)),
        CONSTRAINT coletas_realizacao_consistente CHECK (
          (status = 'Realizada' AND peso_kg IS NOT NULL AND data_realizada IS NOT NULL)
          OR (status IN ('Agendada', 'Cancelada') AND peso_kg IS NULL AND data_realizada IS NULL AND data_cdf IS NULL)
        ),
        CONSTRAINT coletas_cdf_consistente CHECK (
          data_cdf IS NULL OR (status = 'Realizada' AND data_realizada IS NOT NULL AND data_cdf >= data_realizada)
        )
      )
    `);
    await queryRunner.query('CREATE INDEX coletas_cliente_id_idx ON coletas (cliente_id)');
    // As duas datas suportam bases temporais distintas documentadas para o painel.
    await queryRunner.query('CREATE INDEX coletas_data_agendada_idx ON coletas (data_agendada DESC, id)');
    await queryRunner.query("CREATE INDEX coletas_data_realizada_idx ON coletas (data_realizada) WHERE status = 'Realizada'");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE coletas');
    await queryRunner.query('DROP TABLE clientes');
    await queryRunner.query('DROP TABLE usuarios');
  }
}
