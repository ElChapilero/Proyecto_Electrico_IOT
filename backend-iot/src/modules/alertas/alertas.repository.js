const pool = require("../../config/db");
async function list(userId) {
  const r = await pool.query(
    `SELECT a.id, a.tipo_variable, a.valor, a.limite_minimo, a.limite_maximo, a.ocurrido_en, a.revisada, a.revisada_en, a.id_medicion, a.id_configuracion_alerta
     FROM alertas a
     WHERE EXISTS (
       SELECT 1 FROM configuracion_alertas ca
       JOIN circuitos c ON c.id = ca.id_circuito
       JOIN dispositivos d ON d.id = c.id_dispositivo
       JOIN paneles_electricos p ON p.id = d.id_panel
       JOIN accesos_predio ap ON ap.id_predio = p.id_predio
       WHERE ca.id = a.id_configuracion_alerta AND ap.id_usuario = $1
     )
     OR EXISTS (
       SELECT 1 FROM mediciones m
       JOIN circuitos c ON c.id = m.circuito_id
       JOIN dispositivos d ON d.id = c.id_dispositivo
       JOIN paneles_electricos p ON p.id = d.id_panel
       JOIN accesos_predio ap ON ap.id_predio = p.id_predio
       WHERE m.id = a.id_medicion AND ap.id_usuario = $1
     )
     ORDER BY a.ocurrido_en DESC, a.id DESC`,
    [userId],
  );
  return r.rows;
}
async function listConfig(predioId) {
  const r = await pool.query(
    `SELECT ca.id, ca.id_circuito, ca.nombre, ca.tipo_variable, ca.condicion, ca.limite_minimo, ca.limite_maximo, ca.activa, ca.creado_en, ca.actualizado_en FROM configuracion_alertas ca JOIN circuitos c ON c.id = ca.id_circuito JOIN dispositivos d ON d.id = c.id_dispositivo JOIN paneles_electricos p ON p.id = d.id_panel WHERE p.id_predio = $1 ORDER BY ca.creado_en ASC, ca.id ASC`,
    [predioId],
  );
  return r.rows;
}
async function findConfig(id) {
  const r = await pool.query(
    `SELECT ca.*, p.id_predio FROM configuracion_alertas ca JOIN circuitos c ON c.id = ca.id_circuito JOIN dispositivos d ON d.id = c.id_dispositivo JOIN paneles_electricos p ON p.id = d.id_panel WHERE ca.id = $1`,
    [id],
  );
  return r.rows[0] || null;
}
async function createConfig(data) {
  const r = await pool.query(
    "INSERT INTO configuracion_alertas (id_circuito, nombre, tipo_variable, condicion, limite_minimo, limite_maximo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    [
      data.id_circuito,
      data.nombre,
      data.tipo_variable,
      data.condicion,
      data.limite_minimo ?? null,
      data.limite_maximo ?? null,
    ],
  );
  return r.rows[0];
}
async function updateConfig(id, data) {
  const r = await pool.query(
    "UPDATE configuracion_alertas SET nombre = COALESCE($1, nombre), condicion = COALESCE($2, condicion), limite_minimo = COALESCE($3, limite_minimo), limite_maximo = COALESCE($4, limite_maximo), activa = COALESCE($5, activa), actualizado_en = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *",
    [
      data.nombre || null,
      data.condicion || null,
      data.limite_minimo ?? null,
      data.limite_maximo ?? null,
      data.activa ?? null,
      id,
    ],
  );
  return r.rows[0] || null;
}
async function removeConfig(id) {
  const r = await pool.query(
    "DELETE FROM configuracion_alertas WHERE id = $1 RETURNING id",
    [id],
  );
  return r.rows[0] || null;
}
async function activeConfigsByCircuito(idCircuito) {
  const r = await pool.query(
    "SELECT * FROM configuracion_alertas WHERE id_circuito = $1 AND activa = TRUE",
    [idCircuito],
  );
  return r.rows;
}
async function crearAlerta({
  idConfiguracionAlerta,
  idMedicion,
  tipoVariable,
  valor,
  limiteMinimo,
  limiteMaximo,
}) {
  const r = await pool.query(
    `INSERT INTO alertas (id_configuracion_alerta, id_medicion, tipo_variable, valor, limite_minimo, limite_maximo)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      idConfiguracionAlerta,
      idMedicion,
      tipoVariable,
      valor,
      limiteMinimo ?? null,
      limiteMaximo ?? null,
    ],
  );
  return r.rows[0];
}
module.exports = {
  list,
  listConfig,
  findConfig,
  createConfig,
  updateConfig,
  removeConfig,
  activeConfigsByCircuito,
  crearAlerta,
};
