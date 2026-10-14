// consultar y modificar la base de datos.
const repo = require("./paneles.repository");

// comprueban los permisos del usuario en un predio.
const { esAdministrador, tieneAcceso } = require("../../utils/accesoHelpers");

// Crea errores con un código HTTP
const error = (status, message) =>
  Object.assign(new Error(message), { status, publicMessage: message });

// Obtiene todos los paneles de un predio.
async function list(predioId, userId) {
  if (!(await tieneAcceso(predioId, userId)))
    throw error(403, "No tienes acceso al predio");
  return repo.list(predioId, userId);
}

// Busca un panel específico.
async function get(id, userId) {
  const p = await repo.find(id);
  if (!p) throw error(404, "Panel no encontrado");
  if (!(await tieneAcceso(p.id_predio, userId)))
    throw error(403, "No tienes acceso al panel");
  return p;
}

// Crea un panel nuevo.
async function create(userId, data) {
  
  if (!data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    typeof data.nombre !== "string" ||
    data.nombre.trim().length < 2
  )
    throw error(400, "Falta nombre");
  
  // Si no se especifica el tipo, utiliza "Principal" como valor predeterminado.
  const type = data.tipo_panel || "Principal";

  // Solo permite crear paneles principales o secundarios.
  if (!["Principal", "Secundario"].includes(type))
    throw error(400, "tipo_panel inválido");

  let propertyId = data.id_predio;

  // Para el panel secundario.
  if (type === "Secundario") {
    // Busca el panel que se indicó como principal.
    const principal = await repo.find(data.id_panel_principal);

    // Comprueba que exista y que realmente sea un panel principal.
    if (!principal || principal.tipo_panel !== "Principal")
      throw error(404, "Panel principal no encontrado");

    // Comprueba que el panel principal pertenezca al predio indicado.
    if (principal.id_predio !== data.id_predio)
      throw error(400, "El panel principal no pertenece al predio indicado");

    // se usa el predio del panel principal como predio del panel secundario.
    propertyId = principal.id_predio;
  }

  if (!propertyId || !(await esAdministrador(propertyId, userId)))
    throw error(403, "Se requiere ser administrador del predio");

  // Envía al repositorio
  return repo.create({
    id_predio: propertyId,
    id_panel_principal: type === "Secundario" ? data.id_panel_principal : null,
    nombre: data.nombre.trim(),
    tipo_panel: type,
  });
}

// Actualiza el nombre de un panel existente.
async function update(id, userId, data) {
  const p = await get(id, userId);

  if (!(await esAdministrador(p.id_predio, userId)))
    throw error(403, "Se requiere ser administrador");

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    typeof data.nombre !== "string" ||
    data.nombre.trim().length < 2
  )
    throw error(400, "Falta nombre");

  return repo.update(id, data.nombre.trim());
}

// Elimina un panel existente.
async function remove(id, userId) {
  const p = await get(id, userId);
  if (!(await esAdministrador(p.id_predio, userId)))
    throw error(403, "Se requiere ser administrador");
  await repo.remove(id);
}

module.exports = { list, get, create, update, remove };
