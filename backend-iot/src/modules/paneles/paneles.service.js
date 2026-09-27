const repo = require("./paneles.repository");
const { esAdministrador, tieneAcceso } = require("../../utils/accesoHelpers");
const error = (status, message) =>
  Object.assign(new Error(message), { status, publicMessage: message });
async function list(predioId, userId) {
  if (!(await tieneAcceso(predioId, userId)))
    throw error(403, "No tienes acceso al predio");
  return repo.list(predioId, userId);
}
async function get(id, userId) {
  const p = await repo.find(id);
  if (!p) throw error(404, "Panel no encontrado");
  if (!(await tieneAcceso(p.id_predio, userId)))
    throw error(403, "No tienes acceso al panel");
  return p;
}
async function create(userId, data) {
  if (!data || typeof data !== "object" || Array.isArray(data) || typeof data.nombre !== "string" || data.nombre.trim().length < 2)
    throw error(400, "Falta nombre");
  const type = data.tipo_panel || "Principal";
  if (!["Principal", "Secundario"].includes(type))
    throw error(400, "tipo_panel inválido");
  let propertyId = data.id_predio;
  if (type === "Secundario") {
    const principal = await repo.find(data.id_panel_principal);
    if (!principal || principal.tipo_panel !== "Principal")
      throw error(404, "Panel principal no encontrado");
    // El panel principal debe pertenecer al mismo predio indicado en la URL.
    // Así evitamos crear un panel secundario en un predio diferente.
    if (principal.id_predio !== data.id_predio)
      throw error(400, "El panel principal no pertenece al predio indicado");
    propertyId = principal.id_predio;
  }
  if (!propertyId || !(await esAdministrador(propertyId, userId)))
    throw error(403, "Se requiere ser administrador del predio");
  return repo.create({
    id_predio: propertyId,
    id_panel_principal: type === "Secundario" ? data.id_panel_principal : null,
    nombre: data.nombre.trim(),
    tipo_panel: type,
  });
}
async function update(id, userId, data) {
  const p = await get(id, userId);
  if (!(await esAdministrador(p.id_predio, userId)))
    throw error(403, "Se requiere ser administrador");
  if (!data || typeof data !== "object" || Array.isArray(data) || typeof data.nombre !== "string" || data.nombre.trim().length < 2)
    throw error(400, "Falta nombre");
  return repo.update(id, data.nombre.trim());
}
async function remove(id, userId) {
  const p = await get(id, userId);
  if (!(await esAdministrador(p.id_predio, userId)))
    throw error(403, "Se requiere ser administrador");
  await repo.remove(id);
}
module.exports = { list, get, create, update, remove };
