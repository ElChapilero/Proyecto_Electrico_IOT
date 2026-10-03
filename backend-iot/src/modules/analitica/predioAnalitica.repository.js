const pool = require("../../config/db");

const SCOPE_JOINS = `
  JOIN dispositivos d ON d.id = c.id_dispositivo
  JOIN paneles_electricos p ON p.id = d.id_panel`;

function scopeWhere({ predioId, circuitId, deviceId, panelId }) {
  const params = [predioId];
  const where = ["p.id_predio = $1"];
  if (circuitId) {
    params.push(circuitId);
    where.push(`c.id = $${params.length}`);
  }
  if (deviceId) {
    params.push(deviceId);
    where.push(`d.id = $${params.length}`);
  }
  if (panelId) {
    params.push(panelId);
    where.push(`p.id = $${params.length}`);
  }
  return { params, where: where.join(" AND ") };
}

async function existeScope({ predioId, circuitId, deviceId, panelId }) {
  const scope = scopeWhere({ predioId, circuitId, deviceId, panelId });
  const r = await pool.query(
    `SELECT 1 FROM circuitos c ${SCOPE_JOINS} WHERE ${scope.where} LIMIT 1`,
    scope.params,
  );
  return Boolean(r.rows[0]);
}

async function current(filters) {
  const scope = scopeWhere(filters);
  const r = await pool.query(
    `SELECT DISTINCT ON (m.circuito_id)
       m.id, m.circuito_id, c.indice AS circuito, d.id AS dispositivo_id,
       p.id AS panel_id, m.potencia, m.energia, m.voltaje, m.corriente,
       m.factor_potencia, m.created_at
     FROM mediciones m
     JOIN circuitos c ON c.id = m.circuito_id
     ${SCOPE_JOINS}
     WHERE ${scope.where}
     ORDER BY m.circuito_id, m.created_at DESC, m.id DESC`,
    scope.params,
  );
  return r.rows;
}

function rawAggregatePeriod(period) {
  const trunc =
    period === "week" ? "week" : period === "month" ? "month" : "day";
  return `
    WITH base AS (
      SELECT m.*, c.indice AS circuito, d.id AS dispositivo_id, p.id AS panel_id,
        date_trunc('${trunc}', m.created_at AT TIME ZONE 'America/Bogota') AT TIME ZONE 'America/Bogota' AS periodo,
        LAG(m.energia) OVER (PARTITION BY m.circuito_id, date_trunc('${trunc}', m.created_at AT TIME ZONE 'America/Bogota') ORDER BY m.created_at, m.id) AS energia_anterior
      FROM mediciones m
      JOIN circuitos c ON c.id = m.circuito_id
      ${SCOPE_JOINS}
      WHERE {SCOPE}
        AND ($N::timestamptz IS NULL OR m.created_at >= $N::timestamptz)
        AND ($M::timestamptz IS NULL OR m.created_at <= $M::timestamptz)
    )
    SELECT circuito_id, circuito, dispositivo_id, panel_id, periodo,
      AVG(potencia) AS promedio_potencia, MIN(potencia) AS min_potencia,
      MAX(potencia) AS max_potencia, AVG(voltaje) AS promedio_voltaje,
      AVG(corriente) AS promedio_corriente,
      AVG(factor_potencia) AS promedio_factor_potencia, COUNT(*)::int AS cantidad_muestras,
      MIN(created_at) AS primera_lectura_at, MAX(created_at) AS ultima_lectura_at,
      (array_agg(energia ORDER BY created_at, id) FILTER (WHERE energia IS NOT NULL))[1] AS energia_inicial,
      (array_agg(energia ORDER BY created_at DESC, id DESC) FILTER (WHERE energia IS NOT NULL))[1] AS energia_final,
      CASE WHEN bool_or(energia < energia_anterior) THEN NULL
           ELSE (MAX(energia) - MIN(energia)) END AS consumo_energia,
      COALESCE(bool_or(energia < energia_anterior), FALSE) AS energia_reset_detectado
    FROM base
    GROUP BY circuito_id, circuito, dispositivo_id, panel_id, periodo
    ORDER BY periodo ASC, circuito ASC`;
}

async function aggregate(filters, from, to, period) {
  const scope = scopeWhere(filters);
  const sql = rawAggregatePeriod(period)
    .replace("{SCOPE}", scope.where)
    .replaceAll("$N", `$${scope.params.length + 1}`)
    .replaceAll("$M", `$${scope.params.length + 2}`);
  const r = await pool.query(sql, [...scope.params, from || null, to || null]);
  return r.rows;
}

async function historyHourly(filters, from, to, limit) {
  const scope = scopeWhere(filters);
  const r = await pool.query(
    `SELECT h.*, c.indice AS circuito, d.id AS dispositivo_id, p.id AS panel_id
     FROM mediciones_horarias h
     JOIN circuitos c ON c.id = h.circuito_id
     ${SCOPE_JOINS}
     WHERE ${scope.where}
       AND ($${scope.params.length + 1}::timestamptz IS NULL OR h.fecha_hora >= $${scope.params.length + 1})
       AND ($${scope.params.length + 2}::timestamptz IS NULL OR h.fecha_hora <= $${scope.params.length + 2})
     ORDER BY h.fecha_hora ASC, circuito ASC
     LIMIT $${scope.params.length + 3}`,
    [...scope.params, from || null, to || null, limit],
  );
  return r.rows;
}

async function statistics(filters, from, to) {
  const scope = scopeWhere(filters);
  const r = await pool.query(
    `SELECT COUNT(*)::int AS muestras, AVG(m.potencia) AS potencia_promedio,
       MIN(m.potencia) AS potencia_minima, MAX(m.potencia) AS potencia_maxima,
       AVG(m.voltaje) AS voltaje_promedio, AVG(m.corriente) AS corriente_promedio,
       AVG(m.factor_potencia) AS factor_potencia_promedio,
       MIN(m.created_at) AS desde, MAX(m.created_at) AS hasta
     FROM mediciones m
     JOIN circuitos c ON c.id = m.circuito_id
     ${SCOPE_JOINS}
     WHERE ${scope.where}
       AND ($${scope.params.length + 1}::timestamptz IS NULL OR m.created_at >= $${scope.params.length + 1})
       AND ($${scope.params.length + 2}::timestamptz IS NULL OR m.created_at <= $${scope.params.length + 2})`,
    [...scope.params, from || null, to || null],
  );
  return r.rows[0];
}

function resumenMediciones(filters, from, to, period) {
  const scope = scopeWhere(filters);
  const fromPosition = scope.params.length + 1;
  const toPosition = scope.params.length + 2;
  const periodPosition = scope.params.length + 3;
  const where = `${scope.where}
       AND m.created_at >= COALESCE($${fromPosition}::timestamptz,
         date_trunc($${periodPosition}, now() AT TIME ZONE 'America/Bogota') AT TIME ZONE 'America/Bogota')
       AND m.created_at <= COALESCE($${toPosition}::timestamptz, now())`;

  return {
    params: [...scope.params, from || null, to || null, period],
    sql: `
      WITH ordenadas AS (
        SELECT m.circuito_id, c.indice AS circuito, d.id AS dispositivo_id,
          p.id AS panel_id, p.nombre AS panel_nombre,
          m.potencia, m.energia, m.voltaje, m.corriente, m.factor_potencia,
          m.created_at,
          LAG(m.energia) OVER (
            PARTITION BY m.circuito_id ORDER BY m.created_at, m.id
          ) AS energia_anterior
        FROM mediciones m
        JOIN circuitos c ON c.id = m.circuito_id
        ${SCOPE_JOINS}
        WHERE ${where}
      ), resumen_circuitos AS (
        SELECT circuito_id, circuito, dispositivo_id, panel_id, panel_nombre,
          CASE WHEN bool_or(energia < energia_anterior) THEN NULL
               ELSE GREATEST(MAX(energia) - MIN(energia), 0) END AS consumo_energia,
          AVG(potencia) AS promedio_potencia,
          AVG(voltaje) AS promedio_voltaje,
          AVG(corriente) AS promedio_corriente,
          AVG(factor_potencia) AS promedio_factor_potencia,
          COUNT(*)::int AS cantidad_muestras,
          MIN(created_at) AS desde, MAX(created_at) AS hasta
        FROM ordenadas
        GROUP BY circuito_id, circuito, dispositivo_id, panel_id, panel_nombre
      ), resumen_paneles AS (
        SELECT panel_id, panel_nombre,
          SUM(COALESCE(consumo_energia, 0)) AS consumo_energia,
          SUM(promedio_potencia) AS promedio_potencia,
          AVG(promedio_voltaje) AS promedio_voltaje,
          AVG(promedio_corriente) AS promedio_corriente,
          AVG(promedio_factor_potencia) AS promedio_factor_potencia,
          SUM(cantidad_muestras)::int AS cantidad_muestras,
          MIN(desde) AS desde, MAX(hasta) AS hasta
        FROM resumen_circuitos
        GROUP BY panel_id, panel_nombre
      )`,
  };
}

async function comparePanels(filters, from, to, period) {
  const resumen = resumenMediciones(filters, from, to, period);
  const r = await pool.query(
    `${resumen.sql}
      SELECT panel_id, panel_nombre, consumo_energia, promedio_potencia,
        promedio_voltaje, promedio_corriente, promedio_factor_potencia,
        cantidad_muestras, desde, hasta
      FROM resumen_paneles
      ORDER BY panel_nombre NULLS LAST, panel_id`,
    resumen.params,
  );
  return r.rows;
}

async function compareCircuits(filters, from, to, period) {
  const resumen = resumenMediciones(filters, from, to, period);
  const r = await pool.query(
    `${resumen.sql}
      SELECT circuito_id, circuito, dispositivo_id, panel_id, panel_nombre,
        consumo_energia, promedio_potencia, promedio_voltaje,
        promedio_corriente, promedio_factor_potencia, cantidad_muestras,
        desde, hasta
      FROM resumen_circuitos
      ORDER BY panel_nombre NULLS LAST, circuito ASC, circuito_id`,
    resumen.params,
  );
  return r.rows;
}

async function highestConsumption(filters, from, to, period) {
  const resumen = resumenMediciones(filters, from, to, period);
  const r = await pool.query(
    `${resumen.sql}
      SELECT
        (SELECT json_build_object(
          'circuito_id', circuito_id, 'circuito', circuito,
          'dispositivo_id', dispositivo_id, 'panel_id', panel_id,
          'panel_nombre', panel_nombre, 'consumo_energia', consumo_energia,
          'promedio_potencia', promedio_potencia, 'promedio_voltaje', promedio_voltaje,
          'promedio_corriente', promedio_corriente,
          'promedio_factor_potencia', promedio_factor_potencia,
          'cantidad_muestras', cantidad_muestras, 'desde', desde, 'hasta', hasta
        ) FROM resumen_circuitos
         ORDER BY consumo_energia DESC NULLS LAST, circuito_id LIMIT 1) AS circuito,
        (SELECT json_build_object(
          'panel_id', panel_id, 'panel_nombre', panel_nombre,
          'consumo_energia', consumo_energia, 'promedio_potencia', promedio_potencia,
          'promedio_voltaje', promedio_voltaje, 'promedio_corriente', promedio_corriente,
          'promedio_factor_potencia', promedio_factor_potencia,
          'cantidad_muestras', cantidad_muestras, 'desde', desde, 'hasta', hasta
        ) FROM resumen_paneles
         ORDER BY consumo_energia DESC NULLS LAST, panel_id LIMIT 1) AS panel`,
    resumen.params,
  );
  return r.rows[0] || { circuito: null, panel: null };
}

async function wholeHomeConsumption(filters, from, to, period) {
  const resumen = resumenMediciones(filters, from, to, period);
  const r = await pool.query(
    `${resumen.sql}
      SELECT COALESCE(SUM(consumo_energia), 0) AS consumo_energia,
        COALESCE(SUM(promedio_potencia), 0) AS promedio_potencia,
        AVG(promedio_voltaje) AS promedio_voltaje,
        AVG(promedio_corriente) AS promedio_corriente,
        AVG(promedio_factor_potencia) AS promedio_factor_potencia,
        COALESCE(SUM(cantidad_muestras), 0)::int AS cantidad_muestras,
        MIN(desde) AS desde, MAX(hasta) AS hasta
      FROM resumen_circuitos`,
    resumen.params,
  );
  return r.rows[0];
}

module.exports = {
  existeScope,
  current,
  aggregate,
  historyHourly,
  statistics,
  comparePanels,
  compareCircuits,
  highestConsumption,
  wholeHomeConsumption,
};
