const repo = require("./usuarios.repository");
const { normalizarEmail } = require("../auth/auth.service");
const { MAX_NAME_LENGTH, validateEmail } = require("../auth/auth.validator");
const error = (status, message) =>
  Object.assign(new Error(message), { status, publicMessage: message });
async function getMe(id) {
  const u = await repo.findById(id);
  if (!u) throw error(404, "Usuario no encontrado");
  return u;
}
async function updateMe(id, data) {
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw error(400, "El body debe ser un objeto");
  const payload = { ...data };
  if (payload.email !== undefined) {
    if (validateEmail(payload.email) !== true) throw error(400, "email inválido");
    // (Fix bug menor 6.1) 
    // Igual que en registro/login, normalizamos el email para mantenerlo
    // siempre con el mismo formato.
    payload.email = normalizarEmail(payload.email);
  }
  if (payload.nombre !== undefined && (typeof payload.nombre !== "string" || payload.nombre.trim().length < 2 || payload.nombre.trim().length > MAX_NAME_LENGTH))
    throw error(400, "nombre inválido");
  if (payload.email === undefined && payload.nombre === undefined)
    throw error(400, "No hay campos válidos para actualizar");
  const updated = await repo.update(id, payload);
  if (!updated) throw error(404, "Usuario no encontrado");
  return updated;
}
module.exports = { getMe, updateMe };
