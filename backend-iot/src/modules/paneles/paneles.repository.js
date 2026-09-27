const pool = require("../../config/db");
async function list(predioId, userId) {
  const r = await pool.query(
    `SELECT p.id, p.id_predio, p.id_panel_principal, p.nombre, p.tipo_panel, p.creado_en FROM paneles_electricos p JOIN accesos_predio a ON a.id_predio = p.id_predio WHERE p.id_predio = $1 AND a.id_usuario = $2 ORDER BY p.creado_en ASC, p.id ASC`,
    [predioId, userId],
  );
  return r.rows;
}
async function find(id) {
  const r = await pool.query(
    "SELECT id, id_predio, id_panel_principal, nombre, tipo_panel, creado_en FROM paneles_electricos WHERE id = $1",
    [id],
  );
  return r.rows[0] || null;
}
async function create(data) {
  const r = await pool.query(
    "INSERT INTO paneles_electricos (id_predio, id_panel_principal, nombre, tipo_panel) VALUES ($1, $2, $3, $4) RETURNING id, id_predio, id_panel_principal, nombre, tipo_panel, creado_en",
    [
      data.id_predio,
      data.id_panel_principal || null,
      data.nombre,
      data.tipo_panel,
    ],
  );
  return r.rows[0];
}
async function update(id, nombre) {
  const r = await pool.query(
    "UPDATE paneles_electricos SET nombre = $1 WHERE id = $2 RETURNING id, id_predio, id_panel_principal, nombre, tipo_panel, creado_en",
    [nombre, id],
  );
  return r.rows[0] || null;
}
async function remove(id) {
  const r = await pool.query(
    "DELETE FROM paneles_electricos WHERE id = $1 RETURNING id",
    [id],
  );
  return r.rows[0] || null;
}
module.exports = { list, find, create, update, remove };
