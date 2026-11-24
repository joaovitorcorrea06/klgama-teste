// Uma consulta mantém todos os blocos no mesmo snapshot do PostgreSQL.
// Numeric vira texto antes do JSON, preservando centavos e precisão das divisões.
export const PAINEL_QUERY = `
WITH meses AS (
  SELECT generate_series($1::date, $2::date - interval '1 month', interval '1 month')::date AS mes
), mtrs AS (
  SELECT data_agendada, data_cdf FROM coletas
  WHERE status <> 'Cancelada' AND data_agendada >= $1::date AND data_agendada < $2::date
), realizadas AS (
  SELECT data_realizada, tipo_residuo, peso_kg, valor_receita, valor_despesa FROM coletas
  WHERE status = 'Realizada' AND data_realizada >= $1::date AND data_realizada < $2::date
), rastreabilidade AS (
  SELECT date_trunc('month', data_agendada)::date AS mes,
    count(*) FILTER (WHERE data_cdf IS NOT NULL)::int AS com_cdf,
    count(*) FILTER (WHERE data_cdf IS NULL)::int AS sem_cdf
  FROM mtrs GROUP BY 1
), financeiro AS (
  SELECT date_trunc('month', data_realizada)::date AS mes,
    sum(valor_receita) AS receita, sum(valor_despesa) AS despesa, sum(peso_kg) / 1000 AS toneladas
  FROM realizadas GROUP BY 1
), total_mtr AS (
  SELECT count(*)::int AS emitidos, count(*) FILTER (WHERE data_cdf IS NOT NULL)::int AS com_cdf,
    count(*) FILTER (WHERE data_cdf IS NULL)::int AS sem_cdf FROM mtrs
), total_financeiro AS (
  SELECT coalesce(sum(valor_receita), 0) AS receita, coalesce(sum(valor_despesa), 0) AS despesa,
    coalesce(sum(peso_kg), 0) / 1000 AS toneladas FROM realizadas
), residuos AS (
  SELECT tipo_residuo, sum(peso_kg) / 1000 AS toneladas FROM realizadas GROUP BY tipo_residuo
)
SELECT jsonb_build_object(
  'indicadores', (SELECT jsonb_build_object(
    'emitidos', t.emitidos, 'mediaMensalMtr', (t.emitidos::numeric / $3::int)::text,
    'comCdf', t.com_cdf, 'semCdf', t.sem_cdf,
    'percentualComCdf', coalesce(t.com_cdf::numeric * 100 / nullif(t.emitidos, 0), 0)::text,
    'percentualSemCdf', coalesce(t.sem_cdf::numeric * 100 / nullif(t.emitidos, 0), 0)::text,
    'receita', f.receita::text, 'despesa', f.despesa::text,
    'saldo', (f.receita - f.despesa)::text, 'toneladas', f.toneladas::text
  ) FROM total_mtr t CROSS JOIN total_financeiro f),
  'financeiroMensal', (SELECT jsonb_agg(jsonb_build_object(
    'mes', to_char(m.mes, 'YYYY-MM'), 'receita', coalesce(f.receita, 0)::text,
    'despesa', coalesce(f.despesa, 0)::text, 'saldo', (coalesce(f.receita, 0) - coalesce(f.despesa, 0))::text
  ) ORDER BY m.mes) FROM meses m LEFT JOIN financeiro f USING (mes)),
  'rastreabilidadeMensal', (SELECT jsonb_agg(jsonb_build_object(
    'mes', to_char(m.mes, 'YYYY-MM'), 'comCdf', coalesce(r.com_cdf, 0), 'semCdf', coalesce(r.sem_cdf, 0)
  ) ORDER BY m.mes) FROM meses m LEFT JOIN rastreabilidade r USING (mes)),
  'composicaoResiduos', coalesce((SELECT jsonb_agg(jsonb_build_object(
    'tipoResiduo', r.tipo_residuo, 'toneladas', r.toneladas::text,
    'percentual', coalesce(r.toneladas * 100 / nullif(f.toneladas, 0), 0)::text
  ) ORDER BY r.toneladas DESC, r.tipo_residuo ASC) FROM residuos r CROSS JOIN total_financeiro f), '[]'::jsonb),
  'evolucaoMensal', (SELECT jsonb_agg(jsonb_build_object(
    'mes', to_char(m.mes, 'YYYY-MM'), 'toneladas', coalesce(f.toneladas, 0)::text,
    'receita', coalesce(f.receita, 0)::text, 'despesa', coalesce(f.despesa, 0)::text
  ) ORDER BY m.mes) FROM meses m LEFT JOIN financeiro f USING (mes)),
  'atencao', jsonb_build_object(
    'total', (SELECT count(*)::int FROM coletas WHERE status = 'Realizada' AND data_cdf IS NULL),
    'itens', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', p.id, 'numeroMtr', p.numero_mtr, 'cliente', jsonb_build_object('id', c.id, 'nome', c.nome),
      'dataRealizada', to_char(p.data_realizada, 'YYYY-MM-DD')
    ) ORDER BY p.data_realizada, p.id) FROM (
      SELECT id, numero_mtr, cliente_id, data_realizada FROM coletas
      WHERE status = 'Realizada' AND data_cdf IS NULL ORDER BY data_realizada, id LIMIT 5
    ) p JOIN clientes c ON c.id = p.cliente_id), '[]'::jsonb)
  )
) AS dados
`;
