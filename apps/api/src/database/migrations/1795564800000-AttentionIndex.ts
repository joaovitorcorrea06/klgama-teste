import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AttentionIndex1795564800000 implements MigrationInterface {
  name = 'AttentionIndex1795564800000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE INDEX coletas_atencao_idx ON coletas (data_realizada, id) WHERE status = 'Realizada' AND data_cdf IS NULL");
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX coletas_atencao_idx');
  }
}
