const CAMPOS_REQUERIDOS = [
  'voltaje',
  'corriente',
  'potencia',
  'energia',
  'factor_potencia',
];

const RANGO_VOLTAJE_MINIMO = 80; 
const RANGO_VOLTAJE_MAXIMO = 260; 
const RANGO_CORRIENTE_MINIMO = 0; 
const RANGO_CORRIENTE_MAXIMO = 100; 
const RANGO_POTENCIA_MINIMO = 0; 
const RANGO_POTENCIA_MAXIMO = 23000; 
const RANGO_FACTOR_POTENCIA_MINIMO = 0;
const RANGO_FACTOR_POTENCIA_MAXIMO = 1;

// Tolerancia para comprobar que potencia ≈ voltaje × corriente × factor de potencia.

const TOLERANCIA_MINIMA_VATIOS = 10; 
const TOLERANCIA_PORCENTUAL_CONSISTENCIA = 0.2; 

// Solo generan advertencias en el log, no rechazan la lectura.
const SALTO_VOLTAJE_ADVERTENCIA = 80;
const SALTO_POTENCIA_ADVERTENCIA = 15000; 

/**
 * Capa 1: valida que estén los 5 campos y que todos sean números válidos.
 *
 * @param {object} lectura - Un elemento del arreglo "medidores".
 * @returns {{valido: boolean, tipo?: string, error?: string}}
 */
function validarEstructuraYTipos(lectura) {
  for (const nombreCampo of CAMPOS_REQUERIDOS) {
    const valorCampo = lectura[nombreCampo];

    if (valorCampo === undefined || valorCampo === null) {
      return { valido: false, tipo: 'estructura', error: `Falta el campo "${nombreCampo}"` };
    }
    if (typeof valorCampo !== 'number') {
      return { valido: false, tipo: 'tipo', error: `El campo "${nombreCampo}" debe ser numérico` };
    }
    if (!Number.isFinite(valorCampo)) {
      return { valido: false, tipo: 'numero', error: `El campo "${nombreCampo}" contiene un valor inválido (NaN/Infinity)` };
    }
  }

  return { valido: true };
}

/**
 * Capa 2: valida que los valores estén dentro de rangos físicos posibles.
 *
 * @param {object} lectura - Un elemento del arreglo "medidores".
 * @returns {{valido: boolean, tipo?: string, error?: string}}
 */
function validarRangosFisicos(lectura) {
  if (lectura.voltaje < RANGO_VOLTAJE_MINIMO || lectura.voltaje > RANGO_VOLTAJE_MAXIMO) {
    return { valido: false, tipo: 'rango', error: 'Voltaje fuera de rango' };
  }
  if (lectura.corriente < RANGO_CORRIENTE_MINIMO || lectura.corriente > RANGO_CORRIENTE_MAXIMO) {
    return { valido: false, tipo: 'rango', error: 'Corriente fuera de rango' };
  }
  if (lectura.potencia < RANGO_POTENCIA_MINIMO || lectura.potencia > RANGO_POTENCIA_MAXIMO) {
    return { valido: false, tipo: 'rango', error: 'Potencia fuera de rango' };
  }
  if (lectura.energia < 0) {
    return { valido: false, tipo: 'rango', error: 'La energía acumulada no puede ser negativa' };
  }
  if (
    lectura.factor_potencia < RANGO_FACTOR_POTENCIA_MINIMO ||
    lectura.factor_potencia > RANGO_FACTOR_POTENCIA_MAXIMO
  ) {
    return { valido: false, tipo: 'rango', error: 'Factor de potencia fuera de rango' };
  }

  return { valido: true };
}

/**
 * Capa 3: comprueba que la potencia sea coherente con
 * voltaje × corriente × factor de potencia, usando una tolerancia.
 *
 * @param {object} lectura - Un elemento del arreglo "medidores".
 * @returns {{valido: boolean, tipo?: string, error?: string}}
 */
function validarConsistenciaElectrica(lectura) {
  const potenciaEsperada = lectura.voltaje * lectura.corriente * lectura.factor_potencia;
  const diferenciaPotencia = Math.abs(lectura.potencia - potenciaEsperada);
  const toleranciaPermitida = Math.max(
    TOLERANCIA_MINIMA_VATIOS,
    potenciaEsperada * TOLERANCIA_PORCENTUAL_CONSISTENCIA
  );

  if (diferenciaPotencia > toleranciaPermitida) {
    return {
      valido: false,
      tipo: 'consistencia',
      error: 'Los valores de voltaje, corriente, potencia y factor de potencia no son coherentes entre sí',
    };
  }

  return { valido: true };
}

/**
 * Capa 4: compara con la última lectura del mismo circuito.
 * Solo genera advertencias en el log, nunca rechaza la lectura.
 *
 * @param {object} lecturaActual - La lectura que se está validando ahora.
 * @param {object|null} lecturaAnterior - Última lectura válida guardada
 *   para ese circuito, o null si es la primera que se recibe.
 * @returns {string[]} Lista de advertencias (vacía si no hay nada raro).
 */
function generarAdvertenciasComparativas(lecturaActual, lecturaAnterior) {
  const advertencias = [];

  if (!lecturaAnterior) {
    return advertencias;
  }

  if (lecturaActual.energia < lecturaAnterior.energia) {
    advertencias.push(
      `Posible reinicio del contador de energía (antes: ${lecturaAnterior.energia}, ahora: ${lecturaActual.energia})`
    );
  }

  const diferenciaVoltaje = Math.abs(lecturaActual.voltaje - lecturaAnterior.voltaje);
  if (diferenciaVoltaje > SALTO_VOLTAJE_ADVERTENCIA) {
    advertencias.push(
      `Salto de voltaje inusualmente alto respecto a la lectura anterior (${diferenciaVoltaje.toFixed(1)} V de diferencia)`
    );
  }

  const diferenciaPotencia = Math.abs(lecturaActual.potencia - lecturaAnterior.potencia);
  if (diferenciaPotencia > SALTO_POTENCIA_ADVERTENCIA) {
    advertencias.push(
      `Salto de potencia inusualmente alto respecto a la lectura anterior (${diferenciaPotencia.toFixed(1)} W de diferencia)`
    );
  }

  return advertencias;
}

/**
 * Punto de entrada del validador.
 *
 * @param {object} lectura - Un elemento del arreglo "medidores" del
 *   payload MQTT (debe traer voltaje, corriente, potencia, energia,
 *   factor_potencia).
 * @param {object|null} [lecturaAnterior] - La última lectura válida
 *   guardada para ese mismo circuito, o null/omitido si es la primera.
 * @returns {{valido: boolean, tipo?: string, error?: string, advertencias?: string[]}}
 */
function validarLecturaPzem(lectura, lecturaAnterior = null) {
  const resultadoEstructura = validarEstructuraYTipos(lectura);
  if (!resultadoEstructura.valido) {
    return resultadoEstructura;
  }

  const resultadoRangos = validarRangosFisicos(lectura);
  if (!resultadoRangos.valido) {
    return resultadoRangos;
  }

  const resultadoConsistencia = validarConsistenciaElectrica(lectura);
  if (!resultadoConsistencia.valido) {
    return resultadoConsistencia;
  }

  return {
    valido: true,
    advertencias: generarAdvertenciasComparativas(lectura, lecturaAnterior),
  };
}

module.exports = validarLecturaPzem;
