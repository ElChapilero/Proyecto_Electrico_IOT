// dispositivos.routes.js

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const pool = require('../../config/db');
const { agregarUsuarioMqtt } = require('../../mqtt/mqttAdmin');
const { requiereAuth } = require('../../middleware/authMiddleware');
const { esAdministrador } = require('../../utils/accesoHelpers');

const MQTT_BROKER_HOST = process.env.MQTT_BROKER_HOST || 'CAMBIAR_IP_DEL_BROKER';
const MQTT_BROKER_PORT = process.env.MQTT_BROKER_PORT || 1883;
const NUM_CIRCUITOS_POR_DEFECTO = 2; // el esquema permite hasta 4 por dispositivo (chk_circuito_max_indice)
const MINUTOS_EXPIRACION_CODIGO = 10;

function generarCodigo6Digitos() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

// PROTEGIDA (requiere login): el usuario pide un codigo para vincular un ESP32 nuevo a UN panel especifico. Generar un codigo es "administrar" el predio: solo un administrador.
router.post('/generar-codigo', requiereAuth, async (req, res) => {
  const { id_panel } = req.body || {};

  if (!id_panel) {
    return res.status(400).json({ error: 'Falta id_panel' });
  }

  try {
    const panel = await pool.query('SELECT id_predio FROM paneles_electricos WHERE id = $1', [id_panel]);
    if (panel.rows.length === 0) {
      return res.status(404).json({ error: 'Panel no encontrado' });
    }
    if (!(await esAdministrador(panel.rows[0].id_predio, req.usuario.id))) {
      return res.status(403).json({ error: 'No sos administrador de ese predio' });
    }

    let codigo;
    let intentos = 0;

    do {
      codigo = generarCodigo6Digitos();
      const yaExiste = await pool.query('SELECT id FROM codigos_vinculacion WHERE codigo = $1', [codigo]);
      if (yaExiste.rows.length === 0) break;
      intentos++;
    } while (intentos < 5);

    const expiraEn = new Date(Date.now() + MINUTOS_EXPIRACION_CODIGO * 60000);

    await pool.query(
      'INSERT INTO codigos_vinculacion (id_panel, codigo, expira_en) VALUES ($1, $2, $3)',
      [id_panel, codigo, expiraEn]
    );

    res.json({ codigo, expira_en: expiraEn, minutos_validez: MINUTOS_EXPIRACION_CODIGO });
  } catch (err) {
    console.error('Error generando codigo:', err);
    res.status(500).json({ error: 'Error interno generando el codigo' });
  }
});

// PROTEGIDA: lista los dispositivos de los predios a los que el usuario tiene acceso (administrador O lector). Con ?id_panel= filtra a los de un solo panel.
router.get('/', requiereAuth, async (req, res) => {
  const { id_panel } = req.query;

  try {
    const params = [req.usuario.id];
    let filtro = '';

    if (id_panel) {
      filtro = 'AND d.id_panel = $2';
      params.push(id_panel);
    }

    const dispositivos = await pool.query(
      `SELECT d.id, d.uuid_esp32, d.nombre, d.creado_en, d.id_panel,
              pa.nombre AS nombre_panel, pa.tipo_panel,
              pr.id AS id_predio, pr.nombre AS nombre_predio
       FROM dispositivos d
       JOIN paneles_electricos pa ON pa.id = d.id_panel
       JOIN predios pr ON pr.id = pa.id_predio
       JOIN accesos_predio ac ON ac.id_predio = pr.id
       WHERE ac.id_usuario = $1 ${filtro}
       ORDER BY d.creado_en DESC`,
      params
    );
    res.json(dispositivos.rows);
  } catch (err) {
    console.error('Error listando dispositivos:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});


// PROTEGIDA: renombra un dispositivo y/o lo mueve a otro panel.
// Requiere ser administrador del predio ACTUAL del dispositivo, y si se mueve, tambien del predio DESTINO.
router.patch('/:id', requiereAuth, async (req, res) => {
  const { nombre, id_panel } = req.body || {};

  if (!nombre && !id_panel) {
    return res.status(400).json({ error: 'Nada para actualizar (nombre o id_panel)' });
  }

  try {
    const actual = await pool.query(
      `SELECT d.id, d.nombre, d.id_panel, pa.id_predio
       FROM dispositivos d
       JOIN paneles_electricos pa ON pa.id = d.id_panel
       WHERE d.id = $1`,
      [req.params.id]
    );
    if (actual.rows.length === 0) {
      return res.status(404).json({ error: 'Dispositivo no encontrado' });
    }
    if (!(await esAdministrador(actual.rows[0].id_predio, req.usuario.id))) {
      return res.status(403).json({ error: 'No sos administrador del predio actual de este dispositivo' });
    }

    let nuevoIdPanel = actual.rows[0].id_panel;
    if (id_panel) {
      const destino = await pool.query('SELECT id_predio FROM paneles_electricos WHERE id = $1', [id_panel]);
      if (destino.rows.length === 0) {
        return res.status(404).json({ error: 'Panel destino no encontrado' });
      }
      if (!(await esAdministrador(destino.rows[0].id_predio, req.usuario.id))) {
        return res.status(403).json({ error: 'No sos administrador del predio destino' });
      }
      nuevoIdPanel = id_panel;
    }

    const nuevoNombre = nombre ? nombre.trim() : actual.rows[0].nombre;

    const actualizado = await pool.query(
      `UPDATE dispositivos SET nombre = $1, id_panel = $2 WHERE id = $3
       RETURNING id, uuid_esp32, nombre, id_panel, creado_en`,
      [nuevoNombre, nuevoIdPanel, req.params.id]
    );

    res.json(actualizado.rows[0]);
  } catch (err) {
    console.error('Error actualizando dispositivo:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUBLICA: la llama el ESP32 (no tiene login propio, usa el codigo de vinculacion de un solo uso en su lugar). No depende de accesos_predio para nada - el codigo ya fue autorizado por un administrador cuando se genero.

router.post('/registrar', async (req, res) => {
  const { uuid_esp32, codigo } = req.body || {};

  if (!uuid_esp32 || !codigo) {
    return res.status(400).json({ error: 'Faltan uuid_esp32 o codigo' });
  }

  try {
    const filaCodigo = await pool.query(
      'SELECT id, id_panel FROM codigos_vinculacion WHERE codigo = $1 AND usado = FALSE AND expira_en > now()',
      [codigo]
    );

    if (filaCodigo.rows.length === 0) {
      return res.status(404).json({ error: 'Codigo invalido, ya usado o expirado' });
    }

    const idPanel = filaCodigo.rows[0].id_panel;

    const existente = await pool.query('SELECT id FROM dispositivos WHERE uuid_esp32 = $1', [uuid_esp32]);
    let idDispositivo;

    if (existente.rows.length > 0) {
      idDispositivo = existente.rows[0].id;
      
      await pool.query('UPDATE dispositivos SET id_panel = $1 WHERE id = $2', [idPanel, idDispositivo]);
    } else {
      const conteo = await pool.query('SELECT COUNT(*) FROM dispositivos WHERE id_panel = $1', [idPanel]);
      const numero = Number(conteo.rows[0].count) + 1;
      const nombreAutomatico = `Dispositivo ${numero}`;

      const nuevo = await pool.query(
        'INSERT INTO dispositivos (id_panel, uuid_esp32, nombre) VALUES ($1, $2, $3) RETURNING id',
        [idPanel, uuid_esp32, nombreAutomatico]
      );
      idDispositivo = nuevo.rows[0].id;

      for (let indice = 1; indice <= NUM_CIRCUITOS_POR_DEFECTO; indice++) {
        await pool.query(
          'INSERT INTO circuitos (id_dispositivo, indice, nombre) VALUES ($1, $2, $3)',
          [idDispositivo, indice, `Circuito ${indice}`]
        );
      }
    }

    // El codigo es de un solo uso.
    await pool.query('UPDATE codigos_vinculacion SET usado = TRUE WHERE id = $1', [filaCodigo.rows[0].id]);

    const mqttPassword = crypto.randomBytes(16).toString('hex');
    await agregarUsuarioMqtt(uuid_esp32, mqttPassword);

    return res.json({
      mqtt_username: uuid_esp32,
      mqtt_password: mqttPassword,
      mqtt_broker: MQTT_BROKER_HOST,
      mqtt_port: Number(MQTT_BROKER_PORT)
    });

  } catch (err) {
    console.error('Error registrando dispositivo:', err);
    return res.status(500).json({ error: 'Error interno registrando el dispositivo' });
  }
});

module.exports = router;
