const repo = require("./accesos.repository");
const { esAdministrador } = require("../../utils/accesoHelpers");
const error = (status, message) =>
  Object.assign(new Error(message), { status, publicMessage: message });
const roles = ["administrador", "lector"];
async function authorize(predioId, userId) {
  if (!(await esAdministrador(predioId, userId)))
    throw error(403, "Se requiere ser administrador del predio");
}
async function list(predioId, userId) {
  await authorize(predioId, userId);
  return repo.list(predioId);
}
async function add(predioId, userId, data) {
  await authorize(predioId, userId);
  if (!data || typeof data !== "object" || Array.isArray(data) || typeof data.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) throw error(400, "Email inválido");
  const role = data.rol || "lector";
  if (!roles.includes(role)) throw error(400, "rol inválido");
  const target = await repo.findUserByEmail(data.email.trim().toLowerCase());
  if (!target) throw error(404, "Usuario no encontrado");
  try {
    return await repo.add(predioId, target.id, role);
  } catch (e) {
    if (e.code === "23505") throw error(409, "Ese usuario ya tiene acceso");
    throw e;
  }
}
async function update(predioId, targetId, userId, role) {
  await authorize(predioId, userId);
  if (!roles.includes(role)) throw error(400, "rol inválido");
  try {
    return await repo.updateRoleSafely(predioId, targetId, role, userId);
  } catch (e) {
    if (e.code === "NOT_ADMIN") throw error(403, "Se requiere ser administrador del predio");
    if (e.code === "ACCESS_NOT_FOUND") throw error(404, "Acceso no encontrado");
    if (e.code === "LAST_ADMIN") throw error(409, "El predio necesita al menos un administrador");
    throw e;
  }
}
async function remove(predioId, targetId, userId) {
  await authorize(predioId, userId);
  try {
    await repo.removeSafely(predioId, targetId, userId);
  } catch (e) {
    if (e.code === "NOT_ADMIN") throw error(403, "Se requiere ser administrador del predio");
    if (e.code === "ACCESS_NOT_FOUND") throw error(404, "Acceso no encontrado");
    if (e.code === "LAST_ADMIN") throw error(409, "El predio necesita al menos un administrador");
    throw e;
  }
}
module.exports = { list, add, update, remove };
