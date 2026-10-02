const pool = require("../../config/db");

// La hora se agrupa en America/Bogota y se vuelve a convertir a timestamptz
// para que el instante quede inequívoco en PostgreSQL.
const HOUR_EXPR = `date_trunc('hour', m.created_at AT TIME ZONE 'America/Bogota') AT TIME ZONE 'America/Bogota'`;

async function recalcularHora(circuitoId, instante) {
  const result = await pool.query(
    `WITH base AS (
       SELECT m.*,
              ${HOUR_EXPR} AS hora
       FROM mediciones m
       WHERE m.circuito_id = $1
         AND ${HOUR_EXPR} = date_trunc('hour', $2::timestamptz AT TIME ZONE 'America/Bogota') AT TIME ZONE 'America/Bogota'
     ), resumen AS (
       SELECT
         hora,
         AVG(potencia) AS promedio_potencia,
         MIN(potencia) AS min_potencia,
         MAX(potencia) AS max_potencia,
         AVG(voltaje) AS promedio_voltaje,
         MIN(voltaje) AS min_voltaje,
         MAX(voltaje) AS max_voltaje,
         AVG(corriente) AS promedio_corriente,
         MIN(corriente) AS min_corriente,
         MAX(corriente) AS max_corriente,
         AVG(factor_potencia) AS promedio_factor_potencia,
         MIN(factor_potencia) AS min_factor_potencia,
         MAX(factor_potencia) AS max_factor_potencia,
         COUNT(*)::int AS cantidad_muestras,
         MIN(created_at) AS primera_lectura_at,
         MAX(created_at) AS ultima_lectura_at,
         (SELECT energia FROM base b2 WHERE b2.energia IS NOT NULL ORDER BY b2.created_at ASC, b2.id ASC LIMIT 1) AS energia_inicial,
         (SELECT energia FROM base b3 WHERE b3.energia IS NOT NULL ORDER BY b3.created_at DESC, b3.id DESC LIMIT 1) AS energia_final
       FROM base
       GROUP BY hora
     )
     INSERT INTO mediciones_horarias (
       circuito_id, fecha_hora, promedio_potencia, min_potencia, max_potencia,
       promedio_voltaje, min_voltaje, max_voltaje, promedio_corriente, min_corriente,
       max_corriente,
       promedio_factor_potencia, min_factor_potencia, max_factor_potencia,
       energia_inicial, energia_final, consumo_energia, energia_reset_detectado,
       cantidad_muestras, primera_lectura_at, ultima_lectura_at, calculado_en
     )
     SELECT $1, hora, promedio_potencia, min_potencia, max_potencia,
       promedio_voltaje, min_voltaje, max_voltaje, promedio_corriente, min_corriente,
       max_corriente,
       promedio_factor_potencia, min_factor_potencia, max_factor_potencia,
       energia_inicial, energia_final,
       CASE WHEN energia_inicial IS NOT NULL AND energia_final IS NOT NULL
                 AND energia_final >= energia_inicial
            THEN energia_final - energia_inicial ELSE NULL END,
       (energia_inicial IS NOT NULL AND energia_final IS NOT NULL AND energia_final < energia_inicial),
       cantidad_muestras, primera_lectura_at, ultima_lectura_at, clock_timestamp()
     FROM resumen
     ON CONFLICT (circuito_id, fecha_hora) DO UPDATE SET
       promedio_potencia = EXCLUDED.promedio_potencia,
       min_potencia = EXCLUDED.min_potencia,
       max_potencia = EXCLUDED.max_potencia,
       promedio_voltaje = EXCLUDED.promedio_voltaje,
       min_voltaje = EXCLUDED.min_voltaje,
       max_voltaje = EXCLUDED.max_voltaje,
       promedio_corriente = EXCLUDED.promedio_corriente,
       min_corriente = EXCLUDED.min_corriente,
       max_corriente = EXCLUDED.max_corriente,
       promedio_factor_potencia = EXCLUDED.promedio_factor_potencia,
       min_factor_potencia = EXCLUDED.min_factor_potencia,
       max_factor_potencia = EXCLUDED.max_factor_potencia,
       energia_inicial = EXCLUDED.energia_inicial,
       energia_final = EXCLUDED.energia_final,
       consumo_energia = EXCLUDED.consumo_energia,
       energia_reset_detectado = EXCLUDED.energia_reset_detectado,
       cantidad_muestras = EXCLUDED.cantidad_muestras,
       primera_lectura_at = EXCLUDED.primera_lectura_at,
       ultima_lectura_at = EXCLUDED.ultima_lectura_at,
       calculado_en = clock_timestamp(),
       version_agregacion = mediciones_horarias.version_agregacion + 1
     RETURNING *`,
    [circuitoId, instante],
  );

  if (result.rows[0]) return result.rows[0];
  await pool.query(
    `DELETE FROM mediciones_horarias
     WHERE circuito_id = $1
       AND fecha_hora = date_trunc('hour', $2::timestamptz AT TIME ZONE 'America/Bogota') AT TIME ZONE 'America/Bogota'`,
    [circuitoId, instante],
  );
  return null;
}

module.exports = { recalcularHora };
