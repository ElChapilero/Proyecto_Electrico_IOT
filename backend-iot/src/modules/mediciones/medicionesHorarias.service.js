const repo = require("./medicionesHorarias.repository");

async function recalcularDespuesDeInsertar(circuitoId, instante) {
  try {
    await repo.recalcularHora(circuitoId, instante);
  } catch (error) {
    // La medición original ya fue guardada: un fallo del dato derivado no debe
    // hacer perder telemetría. La hora se puede reconstruir posteriormente.
    console.error("⚠️ No se pudo recalcular el agregado horario:", error.message);
  }
}

module.exports = { recalcularDespuesDeInsertar };
