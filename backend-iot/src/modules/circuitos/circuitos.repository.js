const pool = require("../../config/db");
async function list(deviceId, userId) {
  const r = await pool.query(
    `SELECT c.id, c.id_dispositivo, c.nombre, c.estado, c.indice, c.creado_en FROM circuitos c JOIN dispositivos d ON d.id = c.id_dispositivo JOIN paneles_electricos p ON p.id = d.id_panel JOIN accesos_predio a ON a.id_predio = p.id_predio WHERE c.id_dispositivo = $1 AND a.id_usuario = $2 ORDER BY c.indice ASC`,
    [deviceId, userId],
  );
  return r.rows;
}
async function find(id) {
  const r = await pool.query(
    "SELECT id, id_dispositivo, nombre, estado, indice, creado_en FROM circuitos WHERE id = $1",
    [id],
  );
  return r.rows[0] || null;
}
async function create(deviceId, { nombre, indice }) {
  const r = await pool.query(
    "INSERT INTO circuitos (id_dispositivo, nombre, indice) VALUES ($1, $2, $3) RETURNING id, id_dispositivo, nombre, estado, indice, creado_en",
    [deviceId, nombre, indice],
  );
  return r.rows[0];
}
async function update(id, data) {
  const r = await pool.query(
    "UPDATE circuitos SET nombre = COALESCE($1, nombre), estado = COALESCE($2, estado) WHERE id = $3 RETURNING id, id_dispositivo, nombre, estado, indice, creado_en",
    [
      data.nombre?.trim() || null,
      data.estado === undefined ? null : data.estado,
      id,
    ],
  );
  return r.rows[0] || null;
}
async function remove(id) {
  const r = await pool.query(
    "DELETE FROM circuitos WHERE id = $1 RETURNING id",
    [id],
  );
  return r.rows[0] || null;
}
module.exports = { list, find, create, update, remove };
