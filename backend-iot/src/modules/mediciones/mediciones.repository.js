const pool = require("../../config/db");
async function latest(circuitId) {
  const r = await pool.query(
    `SELECT m.id, m.circuito_id, c.indice AS circuito, m.potencia, m.energia, m.voltaje, m.corriente, m.factor_potencia, m.created_at FROM mediciones m JOIN circuitos c ON c.id = m.circuito_id WHERE m.circuito_id = $1 ORDER BY m.created_at DESC, m.id DESC LIMIT 1`,
    [circuitId],
  );
  return r.rows[0] || null;
}
async function list(circuitId, { limit = 100, from, to }) {
  const params = [circuitId];
  const filters = ["m.circuito_id = $1"];
  if (from) {
    params.push(from);
    filters.push(`m.created_at >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    filters.push(`m.created_at <= $${params.length}`);
  }
  params.push(limit);
  const r = await pool.query(
    `SELECT m.id, m.circuito_id, c.indice AS circuito, m.potencia, m.energia, m.voltaje, m.corriente, m.factor_potencia, m.created_at FROM mediciones m JOIN circuitos c ON c.id = m.circuito_id WHERE ${filters.join(" AND ")} ORDER BY m.created_at ASC, c.indice ASC, m.id ASC LIMIT $${params.length}`,
    params,
  );
  return r.rows;
}
async function consumption(circuitId, from, to, group) {
  const trunc = group === "month" ? "month" : group === "week" ? "week" : "day";
  const r = await pool.query(
    `SELECT date_trunc('${trunc}', created_at) AS periodo, MIN(energia) AS energia_inicial, MAX(energia) AS energia_final, GREATEST(MAX(energia) - MIN(energia), 0) AS consumo, AVG(potencia) AS potencia_promedio, MAX(potencia) AS potencia_maxima FROM mediciones WHERE circuito_id = $1 AND ($2::timestamptz IS NULL OR created_at >= $2) AND ($3::timestamptz IS NULL OR created_at <= $3) GROUP BY 1 ORDER BY 1 ASC`,
    [circuitId, from || null, to || null],
  );
  return r.rows;
}
async function stats(circuitId, from, to) {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS muestras, AVG(potencia) AS potencia_promedio, MAX(potencia) AS potencia_maxima, AVG(voltaje) AS voltaje_promedio, AVG(corriente) AS corriente_promedio, AVG(factor_potencia) AS factor_potencia_promedio, MIN(created_at) AS desde, MAX(created_at) AS hasta FROM mediciones WHERE circuito_id = $1 AND ($2::timestamptz IS NULL OR created_at >= $2) AND ($3::timestamptz IS NULL OR created_at <= $3)`,
    [circuitId, from || null, to || null],
  );
  return r.rows[0];
}
async function comparison(circuitId) {
  const r = await pool.query(
    `WITH periodos AS (SELECT CASE WHEN created_at >= now() - interval '7 days' THEN 'actual' ELSE 'anterior' END AS periodo, GREATEST(MAX(energia) - MIN(energia), 0) AS consumo FROM mediciones WHERE circuito_id = $1 AND created_at >= now() - interval '14 days' GROUP BY 1) SELECT * FROM periodos ORDER BY periodo`,
    [circuitId],
  );
  return r.rows;
}

async function dashboard(circuitId, from, to, period) {
  const bucket = period === "day" ? "hour" : "day";
  const r = await pool.query(
    `WITH filtradas AS (
       SELECT h.*,
              date_trunc('${bucket}', h.fecha_hora AT TIME ZONE 'America/Bogota') AT TIME ZONE 'America/Bogota' AS periodo
       FROM mediciones_horarias h
       WHERE h.circuito_id = $1
         AND h.fecha_hora >= COALESCE(
           $2::timestamptz,
           date_trunc($4, now() AT TIME ZONE 'America/Bogota') AT TIME ZONE 'America/Bogota'
         )
         AND h.fecha_hora <= COALESCE($3::timestamptz, now())
     ), series AS (
       SELECT periodo,
         (array_agg(energia_inicial ORDER BY fecha_hora) FILTER (WHERE energia_inicial IS NOT NULL))[1] AS energia_inicial,
         (array_agg(energia_final ORDER BY fecha_hora DESC) FILTER (WHERE energia_final IS NOT NULL))[1] AS energia_final,
         CASE WHEN bool_or(energia_reset_detectado) THEN NULL ELSE COALESCE(SUM(consumo_energia), 0) END AS consumo_energia,
         COALESCE(bool_or(energia_reset_detectado), FALSE) AS energia_reset_detectado,
         SUM(cantidad_muestras)::int AS cantidad_muestras,
         SUM(promedio_potencia * cantidad_muestras) / NULLIF(SUM(cantidad_muestras), 0) AS promedio_potencia,
         MIN(min_potencia) AS min_potencia, MAX(max_potencia) AS max_potencia,
         SUM(promedio_voltaje * cantidad_muestras) / NULLIF(SUM(cantidad_muestras), 0) AS promedio_voltaje,
         MIN(min_voltaje) AS min_voltaje, MAX(max_voltaje) AS max_voltaje,
         SUM(promedio_corriente * cantidad_muestras) / NULLIF(SUM(cantidad_muestras), 0) AS promedio_corriente,
         MIN(min_corriente) AS min_corriente, MAX(max_corriente) AS max_corriente,
         SUM(promedio_factor_potencia * cantidad_muestras) / NULLIF(SUM(cantidad_muestras), 0) AS promedio_factor_potencia,
         MIN(min_factor_potencia) AS min_factor_potencia, MAX(max_factor_potencia) AS max_factor_potencia,
         MIN(fecha_hora) AS desde, MAX(fecha_hora) AS hasta
       FROM filtradas
       GROUP BY periodo
     ), resumen AS (
       SELECT
         (array_agg(energia_inicial ORDER BY periodo) FILTER (WHERE energia_inicial IS NOT NULL))[1] AS energia_inicial,
         (array_agg(energia_final ORDER BY periodo DESC) FILTER (WHERE energia_final IS NOT NULL))[1] AS energia_final,
         CASE WHEN bool_or(energia_reset_detectado) THEN NULL ELSE COALESCE(SUM(consumo_energia), 0) END AS consumo_acumulado,
         COALESCE(bool_or(energia_reset_detectado), FALSE) AS energia_reset_detectado,
         SUM(cantidad_muestras)::int AS cantidad_muestras,
         SUM(promedio_potencia * cantidad_muestras) / NULLIF(SUM(cantidad_muestras), 0) AS promedio_potencia,
         MIN(min_potencia) AS min_potencia, MAX(max_potencia) AS max_potencia,
         SUM(promedio_voltaje * cantidad_muestras) / NULLIF(SUM(cantidad_muestras), 0) AS promedio_voltaje,
         MIN(min_voltaje) AS min_voltaje, MAX(max_voltaje) AS max_voltaje,
         SUM(promedio_corriente * cantidad_muestras) / NULLIF(SUM(cantidad_muestras), 0) AS promedio_corriente,
         MIN(min_corriente) AS min_corriente, MAX(max_corriente) AS max_corriente,
         SUM(promedio_factor_potencia * cantidad_muestras) / NULLIF(SUM(cantidad_muestras), 0) AS promedio_factor_potencia,
         MIN(min_factor_potencia) AS min_factor_potencia, MAX(max_factor_potencia) AS max_factor_potencia,
         MIN(desde) AS desde, MAX(hasta) AS hasta
       FROM series
     ), pico AS (
       SELECT periodo AS periodo_mayor_consumo, consumo_energia AS mayor_consumo
       FROM series
       WHERE consumo_energia IS NOT NULL
       ORDER BY consumo_energia DESC, periodo ASC
       LIMIT 1
     )
     SELECT
       COALESCE((SELECT json_agg(s ORDER BY s.periodo) FROM series s), '[]'::json) AS series,
       COALESCE((SELECT row_to_json(x) FROM (SELECT * FROM resumen) x), '{}'::json) AS resumen,
       COALESCE((SELECT row_to_json(p) FROM pico p), '{"periodo_mayor_consumo":null,"mayor_consumo":null}'::json) AS pico`,
    [circuitId, from || null, to || null, period],
  );
  return r.rows[0];
}

module.exports = { latest, list, consumption, stats, comparison, dashboard };
