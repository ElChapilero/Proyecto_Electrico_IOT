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

module.exports = { findById, update };
