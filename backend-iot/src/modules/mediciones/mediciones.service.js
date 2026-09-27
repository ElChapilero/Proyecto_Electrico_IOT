const repo = require("./mediciones.repository");
const { predioDeCircuito, tieneAcceso } = require("../../utils/accesoHelpers");
const error = (status, message) =>
  Object.assign(new Error(message), { status, publicMessage: message });
function validarRangoFechas(query = {}) {
  for (const campo of ["from", "to"]) {
    if (query[campo] !== undefined && (typeof query[campo] !== "string" || Number.isNaN(Date.parse(query[campo]))))
      throw error(400, `${campo} debe ser una fecha válida`);
  }
  if (query.from && query.to && new Date(query.from) > new Date(query.to))
    throw error(400, "from no puede ser posterior a to");
}
async function authorize(circuitId, userId) {
  const property = await predioDeCircuito(circuitId);
  if (!property || !(await tieneAcceso(property, userId)))
    throw error(403, "No tienes acceso al circuito");
}
async function actual(id, userId) {
  await authorize(id, userId);
  const item = await repo.latest(id);
  if (!item) throw error(404, "No hay mediciones para este circuito");
  return item;
}
async function list(id, userId, query) {
  await authorize(id, userId);
  validarRangoFechas(query);
  // (Fix bug menor 6.2) 
  // Validamos el límite antes de enviarlo a SQL para evitar valores inválidos
  // y devolver un error 400 en lugar de un 500.
  const limitCrudo = query.limit === undefined ? 100 : Number(query.limit);
  if (!Number.isInteger(limitCrudo) || limitCrudo < 1 || limitCrudo > 1000)
    throw error(400, "limit debe ser un numero entero entre 1 y 1000");
  return repo.list(id, { ...query, limit: limitCrudo });
}
async function consumo(id, userId, query) {
  await authorize(id, userId);
  validarRangoFechas(query);
  if (query.group !== undefined && !["day", "week", "month"].includes(query.group))
    throw error(400, "group debe ser day, week o month");
  return repo.consumption(id, query.from, query.to, query.group);
}
async function estadisticas(id, userId, query) {
  await authorize(id, userId);
  validarRangoFechas(query);
  return repo.stats(id, query.from, query.to);
}
async function comparaciones(id, userId) {
  await authorize(id, userId);
  return repo.comparison(id);
}
module.exports = { actual, list, consumo, estadisticas, comparaciones };
