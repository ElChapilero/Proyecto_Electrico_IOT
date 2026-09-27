const pool = require("../../config/db");
async function list(predioId) {
  const r = await pool.query(
    `SELECT a.id, a.id_usuario, u.email, u.nombre, a.rol, a.creado_en
    FROM accesos_predio a JOIN usuarios u ON u.id = a.id_usuario
    WHERE a.id_predio = $1 ORDER BY a.creado_en ASC, a.id ASC`,
    [predioId],
  );
  return r.rows;
}
async function find(predioId, userId) {
  const r = await pool.query(
    "SELECT id, id_usuario, rol, creado_en FROM accesos_predio WHERE id_predio = $1 AND id_usuario = $2",
    [predioId, userId],
  );
  return r.rows[0] || null;
}
async function add(predioId, userId, rol) {
  const r = await pool.query(
    "INSERT INTO accesos_predio (id_predio, id_usuario, rol) VALUES ($1, $2, $3) RETURNING id, id_usuario, rol, creado_en",
    [predioId, userId, rol],
  );
  return r.rows[0];
}
async function update(predioId, userId, rol) {
  const r = await pool.query(
    "UPDATE accesos_predio SET rol = $1 WHERE id_predio = $2 AND id_usuario = $3 RETURNING id, id_usuario, rol, creado_en",
    [rol, predioId, userId],
  );
  return r.rows[0] || null;
}
async function remove(predioId, userId) {
  const r = await pool.query(
    "DELETE FROM accesos_predio WHERE id_predio = $1 AND id_usuario = $2 RETURNING id, rol",
    [predioId, userId],
  );
  return r.rows[0] || null;
}
async function countOtherAdmins(predioId, userId) {
  const r = await pool.query(
    "SELECT COUNT(*)::int AS count FROM accesos_predio WHERE id_predio = $1 AND rol = 'administrador' AND id_usuario <> $2",
    [predioId, userId],
  );
  return r.rows[0].count;
}
async function findUserByEmail(email) {
  const r = await pool.query(
    "SELECT id, email, nombre FROM usuarios WHERE LOWER(email) = LOWER($1)",
    [email],
  );
  return r.rows[0] || null;
}

async function updateRoleSafely(predioId, targetId, rol, actorId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query("SELECT id_usuario, rol FROM accesos_predio WHERE id_predio = $1 FOR UPDATE", [predioId]);
    const actor = locked.rows.find((row) => row.id_usuario === actorId);
    if (!actor || actor.rol !== "administrador") { const e = new Error("Sin permisos"); e.code = "NOT_ADMIN"; throw e; }
    const current = locked.rows.find((row) => row.id_usuario === targetId);
    if (current.rowCount !== 1) { const e = new Error("Acceso no encontrado"); e.code = "ACCESS_NOT_FOUND"; throw e; }
    if (current.rows[0].rol === "administrador" && rol === "lector") {
      if (locked.rows.filter((row) => row.rol === "administrador").length <= 1) { const e = new Error("Último administrador"); e.code = "LAST_ADMIN"; throw e; }
    }
    const result = await client.query("UPDATE accesos_predio SET rol = $1 WHERE id_predio = $2 AND id_usuario = $3 RETURNING id, id_usuario, rol, creado_en", [rol, predioId, userId]);
    await client.query("COMMIT");
    return result.rows[0];
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
}

async function removeSafely(predioId, targetId, actorId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query("SELECT id_usuario, rol FROM accesos_predio WHERE id_predio = $1 FOR UPDATE", [predioId]);
    const actor = locked.rows.find((row) => row.id_usuario === actorId);
    if (!actor || actor.rol !== "administrador") { const e = new Error("Sin permisos"); e.code = "NOT_ADMIN"; throw e; }
    const current = locked.rows.find((row) => row.id_usuario === targetId);
    if (!current) { const e = new Error("Acceso no encontrado"); e.code = "ACCESS_NOT_FOUND"; throw e; }
    if (current.rol === "administrador") {
      if (locked.rows.filter((row) => row.rol === "administrador").length <= 1) { const e = new Error("Último administrador"); e.code = "LAST_ADMIN"; throw e; }
    }
    const result = await client.query("DELETE FROM accesos_predio WHERE id_predio = $1 AND id_usuario = $2 RETURNING id, rol", [predioId, targetId]);
    await client.query("COMMIT");
    return result.rows[0];
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
}
module.exports = {
  list,
  find,
  add,
  update,
  remove,
  countOtherAdmins,
  findUserByEmail,
  updateRoleSafely,
  removeSafely,
};
