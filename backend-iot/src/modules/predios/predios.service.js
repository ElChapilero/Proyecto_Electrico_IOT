const repo = require("./predios.repository");
const { esAdministrador } = require("../../utils/accesoHelpers");
const allowed = ["Casa"];
const error = (status, message) =>
  Object.assign(new Error(message), { status, publicMessage: message });
async function list(userId) {
  return repo.listForUser(userId);
}
async function get(id, userId) {
  const item = await repo.findForUser(id, userId);
  if (!item) throw error(404, "Predio no encontrado");
  return item;
}
async function create(userId, data) {
  if (!data || typeof data !== "object" || Array.isArray(data) || typeof data.nombre !== "string" || data.nombre.trim().length < 2)
    throw error(400, "Falta el nombre del predio");
  if (!allowed.includes(data.tipo_predio || "Casa"))
    throw error(400, "tipo_predio inválido");
  return repo.create(userId, data);
}
async function update(id, userId, data) {
  if (!(await esAdministrador(id, userId)))
    throw error(403, "Se requiere ser administrador del predio");
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw error(400, "El body debe ser un objeto");
  if (data.nombre !== undefined && (typeof data.nombre !== "string" || data.nombre.trim().length < 2))
    throw error(400, "nombre inválido");
  if (data.tipo_predio !== undefined && !allowed.includes(data.tipo_predio))
    throw error(400, "tipo_predio inválido");
  if (data.nombre === undefined && data.tipo_predio === undefined)
    throw error(400, "No hay campos válidos para actualizar");
  const item = await repo.update(id, data);
  if (!item) throw error(404, "Predio no encontrado");
  return item;
}
async function remove(id, userId) {
  if (!(await esAdministrador(id, userId)))
    throw error(403, "Se requiere ser administrador del predio");
  const item = await repo.remove(id);
  if (!item) throw error(404, "Predio no encontrado");
}
module.exports = { list, get, create, update, remove };
