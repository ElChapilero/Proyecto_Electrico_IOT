const pool = require("../../config/db");
async function latest(circuitId) {
  const r = await pool.query(
    `SELECT m.id, m.circuito_id, c.indice AS circuito, m.potencia, m.energia, m.voltaje, m.corriente, m.frecuencia, m.factor_potencia, m.created_at FROM mediciones m JOIN circuitos c ON c.id = m.circuito_id WHERE m.circuito_id = $1 ORDER BY m.created_at DESC, m.id DESC LIMIT 1`,
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
    `SELECT m.id, m.circuito_id, c.indice AS circuito, m.potencia, m.energia, m.voltaje, m.corriente, m.frecuencia, m.factor_potencia, m.created_at FROM mediciones m JOIN circuitos c ON c.id = m.circuito_id WHERE ${filters.join(" AND ")} ORDER BY m.created_at ASC, c.indice ASC, m.id ASC LIMIT $${params.length}`,
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
    `SELECT COUNT(*)::int AS muestras, AVG(potencia) AS potencia_promedio, MAX(potencia) AS potencia_maxima, AVG(voltaje) AS voltaje_promedio, AVG(corriente) AS corriente_promedio, AVG(frecuencia) AS frecuencia_promedio, AVG(factor_potencia) AS factor_potencia_promedio, MIN(created_at) AS desde, MAX(created_at) AS hasta FROM mediciones WHERE circuito_id = $1 AND ($2::timestamptz IS NULL OR created_at >= $2) AND ($3::timestamptz IS NULL OR created_at <= $3)`,
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

module.exports = { latest, list, consumption, stats, comparison };
