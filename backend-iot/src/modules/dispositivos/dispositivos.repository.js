const pool = require("../../config/db");
async function listByPanel(panelId, userId) {
  const r = await pool.query(
    `SELECT d.id, d.uuid_esp32, d.nombre, d.id_panel, d.creado_en, p.nombre AS nombre_panel, p.id_predio FROM dispositivos d JOIN paneles_electricos p ON p.id = d.id_panel JOIN accesos_predio a ON a.id_predio = p.id_predio WHERE d.id_panel = $1 AND a.id_usuario = $2 ORDER BY d.creado_en DESC, d.id DESC`,
    [panelId, userId],
  );
  return r.rows;
}
async function findByUuid(uuid) {
  const r = await pool.query(
    "SELECT id, id_panel FROM dispositivos WHERE uuid_esp32 = $1",
    [uuid],
  );
  return r.rows[0] || null;
}
async function find(id) {
  const r = await pool.query(
    "SELECT d.id, d.uuid_esp32, d.nombre, d.id_panel, d.creado_en, p.id_predio FROM dispositivos d JOIN paneles_electricos p ON p.id = d.id_panel WHERE d.id = $1",
    [id],
  );
  return r.rows[0] || null;
}
async function create({ panelId, uuid, nombre, circuitCount = 2 }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const d = (
      await client.query(
        "INSERT INTO dispositivos (id_panel, uuid_esp32, nombre) VALUES ($1, $2, $3) RETURNING id, uuid_esp32, nombre, id_panel, creado_en",
        [panelId, uuid, nombre],
      )
    ).rows[0];
    for (let i = 1; i <= circuitCount; i++)
      await client.query(
        "INSERT INTO circuitos (id_dispositivo, indice, nombre) VALUES ($1, $2, $3)",
        [d.id, i, `Circuito ${i}`],
      );
    await client.query("COMMIT");
    return d;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
async function update(id, data) {
  const r = await pool.query(
    "UPDATE dispositivos SET nombre = COALESCE($1, nombre), id_panel = COALESCE($2, id_panel) WHERE id = $3 RETURNING id, uuid_esp32, nombre, id_panel, creado_en",
    [data.nombre?.trim() || null, data.id_panel || null, id],
  );
  return r.rows[0] || null;
}
async function remove(id) {
  const r = await pool.query(
    "DELETE FROM dispositivos WHERE id = $1 RETURNING id",
    [id],
  );
  return r.rows[0] || null;
}
async function createCode(panelId, code, expiresAt) {
  const r = await pool.query(
    "INSERT INTO codigos_vinculacion (id_panel, codigo, expira_en) VALUES ($1, $2, $3) RETURNING codigo, expira_en",
    [panelId, code, expiresAt],
  );
  return r.rows[0];
}
async function code(code) {
  const r = await pool.query(
    "SELECT id, id_panel FROM codigos_vinculacion WHERE codigo = $1 AND usado = FALSE AND expira_en > now()",
    [code],
  );
  return r.rows[0] || null;
}
// Registra un dispositivo NUEVO (uuid_esp32 que todavia no existe) y lo
// vincula al panel del codigo de vinculacion.
//
// IMPORTANTE: a proposito, esta funcion YA NO acepta "mover" un
// uuid_esp32 que ya pertenece a otro dispositivo. Antes, si el uuid ya
// existia, simplemente le cambiaba el id_panel - eso permitia que
// cualquiera con UN codigo de vinculacion valido (de cualquier panel,
// incluso propio) "robara" un dispositivo ajeno con solo conocer su
// uuid_esp32, recibiendo credenciales MQTT nuevas para el en el proceso.
// El llamador (dispositivos.service.js) verifica con findByUuid() antes
// de invocar esta funcion, y esta funcion vuelve a chequear via la
// restriccion UNIQUE de la base de datos (por si hay una carrera).
// Mover un dispositivo entre paneles/predios sigue existiendo, pero solo
// a traves del flujo autenticado (PATCH /dispositivos/:id), que ya
// exige ser administrador tanto del panel de origen como del destino.
async function register(codeId, panelId, uuid) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const codigo = await client.query(
      "SELECT id, id_panel FROM codigos_vinculacion WHERE id = $1 AND usado = FALSE AND expira_en > now() FOR UPDATE",
      [codeId],
    );
    if (codigo.rowCount !== 1 || codigo.rows[0].id_panel !== panelId) {
      const e = new Error("Código inválido, usado o expirado");
      e.code = "VINCULATION_CODE_INVALID";
      throw e;
    }
    const count = (
      await client.query(
        "SELECT COUNT(*)::int AS count FROM dispositivos WHERE id_panel = $1",
        [panelId],
      )
    ).rows[0].count;
    const d = (
      await client.query(
        "INSERT INTO dispositivos (id_panel, uuid_esp32, nombre) VALUES ($1, $2, $3) RETURNING id",
        [panelId, uuid, `Dispositivo ${count + 1}`],
      )
    ).rows[0];
    for (let i = 1; i <= 2; i++)
      await client.query(
        "INSERT INTO circuitos (id_dispositivo, indice, nombre) VALUES ($1, $2, $3)",
        [d.id, i, `Circuito ${i}`],
      );
    const marcado = await client.query(
      "UPDATE codigos_vinculacion SET usado = TRUE WHERE id = $1 AND usado = FALSE AND expira_en > now() RETURNING id",
      [codeId],
    );
    if (marcado.rowCount !== 1) {
      const e = new Error("Código inválido, usado o expirado");
      e.code = "VINCULATION_CODE_INVALID";
      throw e;
    }
    await client.query("COMMIT");
    return d.id;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// Serializa el flujo completo de registro para un UUID. Esto evita que dos
// solicitudes creen/reemplacen simultáneamente el mismo usuario MQTT antes
// de que PostgreSQL pueda aplicar la restricción UNIQUE.
async function withUuidLock(uuid, callback) {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtextextended($1, 0))", [uuid]);
    return await callback();
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", [uuid]).catch(() => {});
    client.release();
  }
}
module.exports = {
  listByPanel,
  find,
  findByUuid,
  create,
  update,
  remove,
  createCode,
  code,
  register,
  withUuidLock,
};
