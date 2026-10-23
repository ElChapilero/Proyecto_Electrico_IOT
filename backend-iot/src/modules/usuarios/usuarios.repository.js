const pool = require("../../config/db"); // Importa las conexiones a PostgreSQL

// Importa las conexiones a PostgreSQL
async function findById(id) {
  const r = await pool.query(
    "SELECT id, email, nombre, created_at FROM usuarios WHERE id = $1",
    [id],
  );
  return r.rows[0] || null;
}

// Actualiza el correo o el nombre del usuario
async function update(id, { email, nombre }) {
  const r = await pool.query(
    "UPDATE usuarios SET email = COALESCE($1, email), nombre = COALESCE($2, nombre) WHERE id = $3 RETURNING id, email, nombre, created_at",
    [email || null, nombre?.trim() || null, id],
  );
  return r.rows[0] || null;
}

async function findPasswordHash(id) {
  const r = await pool.query(
    "SELECT email, password_hash FROM usuarios WHERE id = $1",
    [id],
  );
  return r.rows[0] || null;
}

async function updatePasswordHash(id, passwordHash) {
  const r = await pool.query(
    "UPDATE usuarios SET password_hash = $1, password_changed_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id",
    [passwordHash, id],
  );
  return r.rows[0] || null;
}

module.exports = { findById, update, findPasswordHash, updatePasswordHash };
