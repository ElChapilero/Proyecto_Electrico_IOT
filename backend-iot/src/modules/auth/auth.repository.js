// Import conexiones a PostgreSQL
const pool = require("../../config/db");

// Busca un usuario por su identificador
async function findById(id) {
  const result = await pool.query(
    "SELECT id, email, nombre, created_at FROM usuarios WHERE id = $1",
    [id],
  );
  return result.rows[0] || null;
}

// Busca un usuario por su correo electrónico
async function findByEmail(email) {
  const result = await pool.query(
    "SELECT id, email, nombre, password_hash, created_at FROM usuarios WHERE LOWER(email) = LOWER($1)",
    [email],
  );
  return result.rows[0] || null;
}

// Crea el usuario, su predio, su acceso y su panel eléctrico
async function createAccount({ email, nombre, passwordHash }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const userResult = await client.query(
      "INSERT INTO usuarios (email, nombre, password_hash) VALUES ($1, $2, $3) RETURNING id, email, nombre, created_at",
      [email, nombre, passwordHash],
    );
    const user = userResult.rows[0];
    const propertyResult = await client.query(
      "INSERT INTO predios (nombre, tipo_predio) VALUES ('Mi predio', 'Casa') RETURNING id, nombre, tipo_predio, creado_en",
    );
    const property = propertyResult.rows[0];
    await client.query(
      "INSERT INTO accesos_predio (id_predio, id_usuario, rol) VALUES ($1, $2, 'administrador')",
      [property.id, user.id],
    );
    const panelResult = await client.query(
      "INSERT INTO paneles_electricos (id_predio, nombre, tipo_panel) VALUES ($1, 'Principal', 'Principal') RETURNING id, id_predio, id_panel_principal, nombre, tipo_panel, creado_en",
      [property.id],
    );
    await client.query("COMMIT");
    return { user, property, panel: panelResult.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { findById, findByEmail, createAccount };
