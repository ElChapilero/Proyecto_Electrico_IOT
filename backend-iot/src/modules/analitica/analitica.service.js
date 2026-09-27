const medicionesService = require("../mediciones/mediciones.service");
async function obtenerConsumoDiario(id, userId, query) {
  return medicionesService.consumo(id, userId, { ...query, group: "day" });
}
async function compararConSemanaAnterior(id, userId) {
  return medicionesService.comparaciones(id, userId);
}
async function obtenerEstadisticas(id, userId, query) {
  return medicionesService.estadisticas(id, userId, query);
}
function calcularCosto(consumo, tarifa = 0) {
  return Number(consumo || 0) * Number(tarifa || 0);
}
module.exports = {
  obtenerConsumoDiario,
  compararConSemanaAnterior,
  obtenerEstadisticas,
  calcularCosto,
};
