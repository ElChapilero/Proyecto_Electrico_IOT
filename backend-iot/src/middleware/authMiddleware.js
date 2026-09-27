// authMiddleware.js
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

function requiereAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Falta el token de autenticacion' });
  }

  try {
    req.usuario = jwt.verify(token, jwtSecret); // { id, email }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
}

module.exports = { requiereAuth };
