const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = require('../config/db');
const validarLecturaPzem = require('../modules/mediciones/pzemValidator');
const alertasService = require('../modules/alertas/alertas.service');
const { recalcularDespuesDeInsertar } = require('../modules/mediciones/medicionesHorarias.service');
const { mqtt: mqttConfig } = require('../config/env');
const { emitirMedicionGuardada, emitirEstadoDispositivo } = require('../realtime/realtime.service');
const { obtenerInfoDispositivo } = require('./dispositivoCache');

const MQTT_TLS = mqttConfig.tls;
const MQTT_HOST = mqttConfig.host;
const MQTT_PORT = mqttConfig.port;

const MQTT_CA_FILE = mqttConfig.caFile || process.env.MQTT_CA_FILE ||
  path.join(__dirname, '../../../mqtt-broker-local/config/certs/ca.crt');

const MQTT_USER = mqttConfig.listenerUser;
const MQTT_PASSWORD = mqttConfig.listenerPassword;

const TOPIC_MEDICIONES = 'casa/+/mediciones';
const TOPIC_ESTADO = 'casa/+/estado';

// Última lectura válida por circuito; sirve para comparar, no para rechazar.
// Se vuelve a llenar con nuevas lecturas después de reiniciar el backend.
const cacheUltimaLectura = new Map();

// Evita duplicados MQTT (QoS 1).
// QoS 1 puede entregar el mismo mensaje más de una vez si no recibe el PUBACK.

// El timestamp_ms y el UUID del ESP32 permiten identificar reenvíos recientes.
const mensajesRecientes = new Map(); // Clave: UUID del ESP32 + timestamp_ms
const ultimoTimestampPorDispositivo = new Map();
const colasPorDispositivo = new Map();
const VENTANA_DEDUPLICACION_MS = 30000; // Ventana de 30 segundos
const EPOCH_MINIMO_DISPOSITIVO_MS = Date.UTC(2024, 0, 1);

function obtenerFechaDispositivo(timestampMs) {
  if (timestampMs === undefined || timestampMs === null || timestampMs === '') return null;
  const numero = typeof timestampMs === 'number' ? timestampMs : Number(timestampMs);
  if (!Number.isSafeInteger(numero) || numero < EPOCH_MINIMO_DISPOSITIVO_MS) return null;
  const fecha = new Date(numero);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function limpiarMensajesAntiguos() {
  const ahora = Date.now();
  for (const [claveMensaje, marcaDeTiempo] of mensajesRecientes) {
    if (ahora - marcaDeTiempo > VENTANA_DEDUPLICACION_MS) {
      mensajesRecientes.delete(claveMensaje);
    }
  }
}

function esMensajeDuplicado(uuidEsp32, timestampDispositivoMs) {
  limpiarMensajesAntiguos();

  const anterior = ultimoTimestampPorDispositivo.get(uuidEsp32);
  if (Number.isFinite(timestampDispositivoMs) && Number.isFinite(anterior) && timestampDispositivoMs < anterior) {
    for (const clave of mensajesRecientes.keys()) {
      if (clave.startsWith(`${uuidEsp32}:`)) mensajesRecientes.delete(clave);
    }
  }
  if (Number.isFinite(timestampDispositivoMs)) {
    ultimoTimestampPorDispositivo.set(uuidEsp32, timestampDispositivoMs);
  }

  const claveMensaje = `${uuidEsp32}:${timestampDispositivoMs}`;
  if (mensajesRecientes.has(claveMensaje)) {
    return true;
  }

  mensajesRecientes.set(claveMensaje, Date.now());
  return false;
}

function iniciarMqttListener(io) {
  const protocolo = MQTT_TLS ? 'mqtts' : 'mqtt';
  const opciones = {
    username: MQTT_USER,
    password: MQTT_PASSWORD,
    clientId: 'backend_' + Math.random().toString(16).slice(2, 8),
    reconnectPeriod: 5000,
  };

  if (MQTT_TLS) {
    opciones.ca = fs.readFileSync(MQTT_CA_FILE); // Verifica el certificado del broker.
  }

  const client = mqtt.connect(`${protocolo}://${MQTT_HOST}:${MQTT_PORT}`, opciones);

  client.on('connect', () => {
    console.log('✅ Backend conectado a Mosquitto');
    // QoS 1 prioriza no perder mediciones y puede generar duplicados.
    // La función de deduplicación los detecta.
    client.subscribe([TOPIC_MEDICIONES, TOPIC_ESTADO], { qos: 1 }, (err) => {
      if (err) console.error('❌ Error al suscribirse:', err.message);
      else console.log(`📡 Suscrito a: ${TOPIC_MEDICIONES} y ${TOPIC_ESTADO}`);
    });
  });

  client.on('message', async (topic, payload) => {
    const uuidEsp32 = topic.split('/')[1];
    const anterior = colasPorDispositivo.get(uuidEsp32) || Promise.resolve();
    let liberar;
    const turno = new Promise((resolve) => { liberar = resolve; });
    const colaActual = anterior.then(() => turno);
    colasPorDispositivo.set(uuidEsp32, colaActual);
    await anterior;
    try {
      const infoDispositivo = await obtenerInfoDispositivo(uuidEsp32);

    if (topic.endsWith('/estado')) {
      const estado = payload.toString();
      console.log(`🔌 [${uuidEsp32}] estado: ${estado}`);
      // Sin un dispositivo registrado, no se conoce su predio y no se emite el estado.
      if (infoDispositivo) {
        emitirEstadoDispositivo(io, infoDispositivo.idPredio, { uuid: uuidEsp32, estado });
      }
      return;
    }

    let datos;
    try {
      datos = JSON.parse(payload.toString());
      } catch (error) {
        console.error('⚠️ No se pudo parsear el mensaje MQTT:', error.message);
        return;
      }
      if (!datos || typeof datos !== 'object' || !Array.isArray(datos.medidores)) {
        console.warn(`⚠️ Payload MQTT inválido [${uuidEsp32}]: medidores debe ser una lista`);
        return;
      }

    const fechaPaquete = obtenerFechaDispositivo(datos.timestamp_ms);
    if (!fechaPaquete) {
      console.warn(`⚠️ Payload MQTT descartado [${uuidEsp32}]: timestamp_ms inválido o ausente`);
      return;
    }

    // Descarta paquetes repetidos que el broker puede reenviar con QoS 1.
    const timestampDispositivo = Number(datos.timestamp_ms);
    if (Number.isSafeInteger(timestampDispositivo) && esMensajeDuplicado(uuidEsp32, timestampDispositivo)) {
      console.warn(`♻️ Mensaje duplicado descartado (QoS 1) [${uuidEsp32}] timestamp_ms=${datos.timestamp_ms}`);
      return;
    }

    const listaMedidores = datos.medidores;
    // Todas las lecturas del paquete comparten la hora de recepción del backend.
    const recibidoEn = new Date();

    // Incluye solo lecturas válidas y guardadas; esta lista se envía por Socket.IO.
    const medicionesGuardadas = [];

    for (const medidor of listaMedidores) {
      try {
        const idCircuito = infoDispositivo?.porIndice[medidor.circuito];

        if (!idCircuito) {
          console.warn(`⚠️ Dispositivo/circuito desconocido: ${uuidEsp32} circuito ${medidor.circuito} (¿ya se registró?)`);
          continue;
        }

        const lecturaAnterior = cacheUltimaLectura.get(idCircuito) || null;
        const resultadoValidacion = validarLecturaPzem(medidor, lecturaAnterior);

        if (!resultadoValidacion.valido) {
          console.warn(
            `🚫 Lectura rechazada [${uuidEsp32} circuito ${medidor.circuito}] (${resultadoValidacion.tipo}): ${resultadoValidacion.error}`
          );
          continue; // No se guarda una lectura inválida.
        }

        // Las advertencias informan, pero no bloquean el guardado.
        (resultadoValidacion.advertencias || []).forEach((textoAdvertencia) => {
          console.warn(`⚠️ [${uuidEsp32} circuito ${medidor.circuito}] ${textoAdvertencia}`);
        });

        const tieneTimestampMedicion = medidor.timestamp_ms !== undefined &&
          medidor.timestamp_ms !== null && medidor.timestamp_ms !== '';
        const fechaMedicion = tieneTimestampMedicion
          ? obtenerFechaDispositivo(medidor.timestamp_ms)
          : fechaPaquete;
        if (!fechaMedicion) {
          console.warn(`🚫 Lectura rechazada [${uuidEsp32} circuito ${medidor.circuito}]: timestamp_ms inválido`);
          continue;
        }

        const filaMedicion = await pool.query(
          `INSERT INTO mediciones (circuito_id, potencia, energia, voltaje, corriente, factor_potencia, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [idCircuito, medidor.potencia, medidor.energia, medidor.voltaje, medidor.corriente, medidor.factor_potencia, fechaMedicion]
        );
        const idMedicion = filaMedicion.rows[0].id;

        // El agregado es complementario: no reemplaza la medición original.
        // Si falla, la medición sigue guardada y el agregado puede reconstruirse.
        await recalcularDespuesDeInsertar(idCircuito, fechaMedicion);

        // Actualiza la caché solo después de guardar la medición en PostgreSQL.
        cacheUltimaLectura.set(idCircuito, medidor);

        // (Fix bug crítico 1.1)
        // Evalúa y registra las alertas del circuito después de guardar la medición.
        await alertasService.evaluarYRegistrarAlertas(
          idCircuito,
          medidor,
          idMedicion,
          io,
          infoDispositivo.idPredio,
        );

        medicionesGuardadas.push({
          circuito: medidor.circuito,
          id_circuito: idCircuito,
          voltaje: medidor.voltaje,
          corriente: medidor.corriente,
          potencia: medidor.potencia,
          energia: medidor.energia,
          factor_potencia: medidor.factor_potencia,
        });
      } catch (error) {
        console.error(`❌ Error guardando medicion (circuito ${medidor.circuito}) de ${uuidEsp32}:`, error.message);
        // Cada medidor se guarda por separado para que un error no afecte a los demás.
        // Con más volumen, se puede cambiar a un INSERT por lote y una transacción.
      }
    }

    console.log(
      `📥 [${uuidEsp32}] paquete procesado: ${medicionesGuardadas.length} de ${listaMedidores.length} lecturas guardadas`
    );
    // Reenvía por Socket.IO solo las mediciones guardadas en PostgreSQL.
    // Así no se muestran lecturas rechazadas ni fallidas, y no se usa io.emit() global.

    
    // Envía el evento solo a la sala del predio correspondiente.
    if (medicionesGuardadas.length > 0 && infoDispositivo) {
      emitirMedicionGuardada(io, infoDispositivo.idPredio, {
        topic,
        uuid_esp32: uuidEsp32,
        medidores: medicionesGuardadas,
        // Socket.IO usa la hora de recepción; PostgreSQL guarda fechaMedicion.
        timestamp: recibidoEn.toISOString(),
        timestamp_dispositivo_ms: datos.timestamp_ms ?? null,
      });
    }
    } catch (error) {
      console.error('❌ Error no controlado procesando mensaje MQTT:', error.message);
    } finally {
      liberar();
      if (colasPorDispositivo.get(uuidEsp32) === colaActual) colasPorDispositivo.delete(uuidEsp32);
    }
  });

  client.on('error', (err) => console.error('❌ Error de conexion MQTT:', err.message));
  client.on('reconnect', () => console.log('♻️ Reintentando conexion MQTT...'));

  return client;
}

module.exports = { iniciarMqttListener };