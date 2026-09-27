const pool = require("../../config/db");

async function listForUser(userId) {
  const r = await pool.query(
    `SELECT p.id, p.nombre, p.tipo_predio, p.creado_en, a.rol
    FROM predios p JOIN accesos_predio a ON a.id_predio = p.id
    WHERE a.id_usuario = $1 ORDER BY p.creado_en ASC, p.id ASC`,
    [userId],
  );
  return r.rows;
}
async function findForUser(id, userId) {
  const r = await pool.query(
    `SELECT p.id, p.nombre, p.tipo_predio, p.creado_en, a.rol
    FROM predios p JOIN accesos_predio a ON a.id_predio = p.id
    WHERE p.id = $1 AND a.id_usuario = $2`,
    [id, userId],
  );
  return r.rows[0] || null;
}
async function create(userId, { nombre, tipo_predio = "Casa" }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const p = (
      await client.query(
        "INSERT INTO predios (nombre, tipo_predio) VALUES ($1, $2) RETURNING id, nombre, tipo_predio, creado_en",
        [nombre.trim(), tipo_predio],
      )
    ).rows[0];
    await client.query(
      "INSERT INTO accesos_predio (id_predio, id_usuario, rol) VALUES ($1, $2, 'administrador')",
      [p.id, userId],
    );
    await client.query("COMMIT");
    return { ...p, rol: "administrador" };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
async function update(id, data) {
  const r = await pool.query(
    `UPDATE predios SET nombre = COALESCE($1, nombre), tipo_predio = COALESCE($2, tipo_predio)
    WHERE id = $3 RETURNING id, nombre, tipo_predio, creado_en`,
    [data.nombre?.trim() || null, data.tipo_predio || null, id],
  );
  return r.rows[0] || null;
}
async function remove(id) {
  const r = await pool.query("DELETE FROM predios WHERE id = $1 RETURNING id", [
    id,
  ]);
  return r.rows[0] || null;
}
module.exports = { listForUser, findForUser, create, update, remove };
