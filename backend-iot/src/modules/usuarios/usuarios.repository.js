const pool = require("../../config/db");
async function findById(id) {
  const r = await pool.query(
    "SELECT id, email, nombre, created_at FROM usuarios WHERE id = $1",
    [id],
  );
  return r.rows[0] || null;
}
async function update(id, { email, nombre }) {
  const r = await pool.query(
    "UPDATE usuarios SET email = COALESCE($1, email), nombre = COALESCE($2, nombre) WHERE id = $3 RETURNING id, email, nombre, created_at",
    [email || null, nombre?.trim() || null, id],
  );
  return r.rows[0] || null;
}
module.exports = { findById, update };
