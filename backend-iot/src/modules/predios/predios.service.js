const repo = require("./predios.repository"); // modifican los predios en la base de datos

const { esAdministrador } = require("../../utils/accesoHelpers"); // el usuario es administrador del predio?

const allowed = ["Casa"]; // Tipos de predio

// Crea un error con su código HTTP
const error = (status, message) =>
  Object.assign(new Error(message), { status, publicMessage: message });

// Obtiene los predios a los que tiene acceso el usuario
async function list(userId) {
  return repo.listForUser(userId);
}

// Busca un predio al que tenga acceso el usuario
async function get(id, userId) {
  const item = await repo.findForUser(id, userId);
  if (!item) throw error(404, "Predio no encontrado");
  return item;
}

// Crea un predio nuevo para el usuario
async function create(userId, data) {
  if (!data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    typeof data.nombre !== "string" ||
    data.nombre.trim().length < 2
  )
    throw error(400, "Falta el nombre del predio");

  // Comprueba que el tipo de predio esté permitido.
  if (!allowed.includes(data.tipo_predio || "Casa"))
    throw error(400, "tipo_predio inválido");
  return repo.create(userId, data);
}

// Actualiza los datos de un predio
async function update(id, userId, data) {
  if (!(await esAdministrador(id, userId)))
    throw error(403, "Se requiere ser administrador del predio");

  if (!data || typeof data !== "object" || Array.isArray(data))
    throw error(400, "El body debe ser un objeto");
  
  if (data.nombre !== undefined &&
    (typeof data.nombre !== "string" || data.nombre.trim().length < 2))
    throw error(400, "nombre inválido");

  // Si se envía un tipo, comprueba que esté permitido
  if (data.tipo_predio !== undefined && !allowed.includes(data.tipo_predio))
    throw error(400, "tipo_predio inválido");

  // Exige que se envíe al menos un campo que pueda actualizarse
  if (data.nombre === undefined && data.tipo_predio === undefined)
    throw error(400, "No hay campos válidos para actualizar");

  const item = await repo.update(id, data);

  if (!item) throw error(404, "Predio no encontrado");
  return item;
}

// Elimina un predio
async function remove(id, userId) {
  // Solo permite eliminar si el usuario es administrador del predio
  if (!(await esAdministrador(id, userId)))
    throw error(403, "Se requiere ser administrador del predio");

  const item = await repo.remove(id);

  if (!item) throw error(404, "Predio no encontrado");
}

module.exports = { list, get, create, update, remove };
