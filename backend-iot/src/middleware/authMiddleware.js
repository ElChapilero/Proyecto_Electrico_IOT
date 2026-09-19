// authMiddleware.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'CAMBIAR_ESTO_EN_.ENV';

function requiereAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Falta el token de autenticacion' });
  }

  try {
    req.usuario = jwt.verify(token, JWT_SECRET); // { id, email }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
}

module.exports = { requiereAuth };
