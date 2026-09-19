// pzemValidator.js
//
// Validador de las lecturas que llegan del sensor PZEM-004T (a través del
// ESP32 y del broker MQTT) antes de guardarlas en PostgreSQL.
//
// La validación se hace en capas, de la más básica a la más específica:
//
//   1) Estructura y tipos   -> ¿llegaron los 6 campos y son numéricos?
//   2) Rangos físicos       -> ¿los valores son eléctricamente posibles?
//   3) Consistencia         -> ¿potencia ≈ voltaje x corriente x factor_potencia,
//                              dentro de una tolerancia razonable?
//   4) Comparación temporal -> ¿tiene sentido frente a la última lectura
//                              válida de ese mismo circuito?
//
// Los pasos 1, 2 y 3 son OBLIGATORIOS: si alguno falla, la lectura se
// rechaza y no se guarda en la base de datos. El paso 4 es solo
// informativo (genera advertencias para el log) y nunca rechaza una
// lectura por sí solo, porque una vivienda real puede pasar de poca
// carga a mucha carga de un momento a otro (por ejemplo, al prender un
// aire acondicionado) y eso es una lectura válida, no un error.

// ---------------------------------------------------------------------
// Campos que debe traer cada medidor dentro del arreglo "medidores" del
// payload MQTT. Deben coincidir exactamente con las columnas de la
// tabla "mediciones" en PostgreSQL (ver db-iot/schema.sql).
// ---------------------------------------------------------------------
const CAMPOS_REQUERIDOS = [
  'voltaje',
  'corriente',
  'potencia',
  'energia',
  'frecuencia',
  'factor_potencia',
];

// ---------------------------------------------------------------------
// Rangos físicos permitidos para un PZEM-004T en una instalación
// residencial monofásica. Se dejan como constantes con nombre (y no
// como números sueltos dentro de los "if") para que sean fáciles de
// entender y de ajustar si el proyecto cambia de escenario.
// ---------------------------------------------------------------------
const RANGO_VOLTAJE_MINIMO = 80; // voltios
const RANGO_VOLTAJE_MAXIMO = 260; // voltios
const RANGO_CORRIENTE_MINIMO = 0; // amperios
const RANGO_CORRIENTE_MAXIMO = 100; // amperios (límite del PZEM-004T con shunt de 100A)
const RANGO_POTENCIA_MINIMO = 0; // vatios
const RANGO_POTENCIA_MAXIMO = 23000; // vatios (aprox. 100A x 230V)
const RANGO_FRECUENCIA_MINIMO = 45; // hercios
const RANGO_FRECUENCIA_MAXIMO = 65; // hercios
const RANGO_FACTOR_POTENCIA_MINIMO = 0;
const RANGO_FACTOR_POTENCIA_MAXIMO = 1;

// ---------------------------------------------------------------------
// Tolerancia para la validación de consistencia (potencia ≈ voltaje x
// corriente x factor_potencia). Las mediciones reales nunca coinciden
// exactamente por la precisión y resolución del sensor, así que se
// compara contra un margen en vez de exigir una igualdad exacta.
// ---------------------------------------------------------------------
const TOLERANCIA_MINIMA_VATIOS = 10; // piso de tolerancia para lecturas muy bajas (cerca de 0 W)
const TOLERANCIA_PORCENTUAL_CONSISTENCIA = 0.2; // 20% sobre la potencia esperada

// ---------------------------------------------------------------------
// Umbrales para las advertencias comparativas frente a la lectura
// anterior del mismo circuito. Nunca se usan para rechazar, solo para
// avisar en el log.
// ---------------------------------------------------------------------
const SALTO_VOLTAJE_ADVERTENCIA = 80; // voltios
const SALTO_POTENCIA_ADVERTENCIA = 15000; // vatios

/**
 * Capa 1: valida que la lectura tenga los 6 campos esperados y que cada
 * uno sea un número finito (rechaza strings, null, undefined, NaN,
 * Infinity).
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
 * Capa 2: valida que cada valor esté dentro de un rango físicamente
 * posible para una instalación residencial monofásica con PZEM-004T.
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
  if (lectura.frecuencia < RANGO_FRECUENCIA_MINIMO || lectura.frecuencia > RANGO_FRECUENCIA_MAXIMO) {
    return { valido: false, tipo: 'rango', error: 'Frecuencia fuera de rango' };
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
 * Capa 3: valida que la potencia reportada sea coherente con
 * potencia = voltaje x corriente x factor_potencia, dentro de un
 * margen de tolerancia (no se exige igualdad exacta).
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
 * Capa 4 (complementaria, NO bloqueante): compara la lectura actual
 * contra la última lectura válida del MISMO circuito y devuelve un
 * arreglo de advertencias en texto. Nunca rechaza la lectura: solo
 * sirve para dejar aviso en el log de algo que convendría revisar
 * (por ejemplo, un reinicio del contador de energía del dispositivo).
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
 * Punto de entrada del validador. Corre las 3 capas obligatorias en
 * orden (estructura/tipos -> rangos -> consistencia) y, solo si todas
 * pasan, agrega advertencias comparativas (no bloqueantes) contra la
 * lectura anterior del mismo circuito.
 *
 * @param {object} lectura - Un elemento del arreglo "medidores" del
 *   payload MQTT (debe traer voltaje, corriente, potencia, energia,
 *   frecuencia y factor_potencia).
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