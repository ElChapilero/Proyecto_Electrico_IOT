// paneles.routes.js

const express = require('express');
const router = express.Router();

const pool = require('../../config/db');
const { requiereAuth } = require('../../middleware/authMiddleware');
const { esAdministrador } = require('../../utils/accesoHelpers');

const TIPOS_PANEL_VALIDOS = ['Principal', 'Secundario'];

router.post('/', requiereAuth, async (req, res) => {
  const { nombre, tipo_panel } = req.body || {};
  const tipo = tipo_panel || 'Principal';

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'Falta el nombre del panel' });
  }
  if (!TIPOS_PANEL_VALIDOS.includes(tipo)) {
    return res.status(400).json({
      error: `tipo_panel invalido. Valores permitidos: ${TIPOS_PANEL_VALIDOS.join(', ')}`,
    });
  }

  try {
    if (tipo === 'Principal') {
      const { id_predio } = req.body || {};
      if (!id_predio) {
        return res.status(400).json({ error: 'Falta id_predio' });
      }
      if (!(await esAdministrador(id_predio, req.usuario.id))) {
        return res.status(403).json({ error: 'No sos administrador de ese predio' });
      }

      const nuevo = await pool.query(
        `INSERT INTO paneles_electricos (id_predio, nombre, tipo_panel)
         VALUES ($1, $2, $3)
         RETURNING id, id_predio, id_panel_principal, nombre, tipo_panel, creado_en`,
        [id_predio, nombre.trim(), tipo]
      );
      return res.status(201).json(nuevo.rows[0]);
    }

    // tipo === 'Secundario'
    const { id_panel_principal } = req.body || {};
    if (!id_panel_principal) {
      return res.status(400).json({ error: 'Falta id_panel_principal' });
    }

    const principal = await pool.query(
      `SELECT id, id_predio FROM paneles_electricos WHERE id = $1 AND tipo_panel = 'Principal'`,
      [id_panel_principal]
    );
    if (principal.rows.length === 0) {
      return res.status(404).json({ error: 'Panel principal no encontrado' });
    }
    if (!(await esAdministrador(principal.rows[0].id_predio, req.usuario.id))) {
      return res.status(403).json({ error: 'No sos administrador de ese predio' });
    }

    const nuevo = await pool.query(
      `INSERT INTO paneles_electricos (id_predio, id_panel_principal, nombre, tipo_panel)
       VALUES ($1, $2, $3, $4)
       RETURNING id, id_predio, id_panel_principal, nombre, tipo_panel, creado_en`,
      [principal.rows[0].id_predio, id_panel_principal, nombre.trim(), tipo]
    );
    return res.status(201).json(nuevo.rows[0]);
  } catch (err) {
    console.error('Error creando panel:', err);
    res.status(500).json({ error: 'Error interno creando el panel' });
  }
});

// PROTEGIDA: lista los paneles de los predios a los que el usuario tiene acceso (administrador O lector). Con ?id_predio= filtra a los de un predio.
router.get('/', requiereAuth, async (req, res) => {
  const { id_predio } = req.query;

  try {
    const params = [req.usuario.id];
    let filtro = '';

    if (id_predio) {
      filtro = 'AND p.id_predio = $2';
      params.push(id_predio);
    }

    const paneles = await pool.query(
      `SELECT p.id, p.id_predio, p.id_panel_principal, p.nombre, p.tipo_panel, p.creado_en
       FROM paneles_electricos p
       JOIN accesos_predio ac ON ac.id_predio = p.id_predio
       WHERE ac.id_usuario = $1 ${filtro}
       ORDER BY p.creado_en ASC`,
      params
    );
    res.json(paneles.rows);
  } catch (err) {
    console.error('Error listando paneles:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PROTEGIDA: renombra un panel. Solo administrador del predio.
router.patch('/:id', requiereAuth, async (req, res) => {
  const { nombre } = req.body || {};

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'Falta el nombre' });
  }

  try {
    const panel = await pool.query('SELECT id_predio FROM paneles_electricos WHERE id = $1', [req.params.id]);
    if (panel.rows.length === 0) {
      return res.status(404).json({ error: 'Panel no encontrado' });
    }
    if (!(await esAdministrador(panel.rows[0].id_predio, req.usuario.id))) {
      return res.status(403).json({ error: 'No sos administrador de este predio' });
    }

    const actualizado = await pool.query(
      `UPDATE paneles_electricos SET nombre = $1 WHERE id = $2
       RETURNING id, id_predio, id_panel_principal, nombre, tipo_panel, creado_en`,
      [nombre.trim(), req.params.id]
    );

    res.json(actualizado.rows[0]);
  } catch (err) {
    console.error('Error actualizando panel:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PROTEGIDA: borra un panel. Solo administrador del predio. Por el ON DELETE CASCADE, se lleva puestos sus paneles secundarios (si es un Principal), sus dispositivos, circuitos y mediciones.
router.delete('/:id', requiereAuth, async (req, res) => {
  try {
    const panel = await pool.query('SELECT id_predio FROM paneles_electricos WHERE id = $1', [req.params.id]);
    if (panel.rows.length === 0) {
      return res.status(404).json({ error: 'Panel no encontrado' });
    }
    if (!(await esAdministrador(panel.rows[0].id_predio, req.usuario.id))) {
      return res.status(403).json({ error: 'No sos administrador de este predio' });
    }

    await pool.query('DELETE FROM paneles_electricos WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    console.error('Error borrando panel:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
