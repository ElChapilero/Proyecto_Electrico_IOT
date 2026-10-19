// librerias
#include <WiFi.h>
#include <WiFiClientSecure.h> // Cliente TLS para MQTT seguro
#include <MQTT.h> // Cliente MQTT
#include <ArduinoJson.h>
#include <Preferences.h> // Guardar datos en memoria flash (NVS)
#include <WebServer.h> // Servidor web local del portal
#include <HTTPClient.h> // Peticiones HTTP al backend
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h> // Utilidades BLE
#include <BLE2902.h> // notificaciones BLE
#include <time.h>
#include <sys/time.h>

#define MAX_MEDIDORES 2 // Cantidad de circuitos simulados que se reportan.

// La configuración local queda en firmware_config.h, ignorado por Git.
// Copia firmware_config.example.h como firmware_config.h antes de compilar.
#include "firmware_config_test.h"

// almacenamiento persistente (NVS)
Preferences prefs;

String cfgWifiSsid;
String cfgWifiPass;
String cfgDeviceUuid;
String cfgMqttUser;
String cfgMqttPass;
bool   cfgProvisionado = false; // True si ya se vinculó al backend

// Recupera de la memoria flash las credenciales y el estado de registro.
void cargarConfiguracion() {
  prefs.begin("iot_cfg", true); // olo lectura
  cfgWifiSsid     = prefs.getString("wifi_ssid", "");
  cfgWifiPass     = prefs.getString("wifi_pass", "");
  cfgDeviceUuid   = prefs.getString("device_uuid", "");
  cfgMqttUser     = prefs.getString("mqtt_user", "");
  cfgMqttPass     = prefs.getString("mqtt_pass", "");
  cfgProvisionado = prefs.getBool("provisionado", false);
  prefs.end(); // Cerrar acceso a flash
}

// Guarda las credenciales WiFi y actualiza la copia usada por el programa.
void guardarWifi(const String& ssid, const String& pass) {
  prefs.begin("iot_cfg", false); // Abrir en modo escritura
  prefs.putString("wifi_ssid", ssid);
  prefs.putString("wifi_pass", pass);
  prefs.end();
  cfgWifiSsid = ssid; // Actualizar copia en RAM
  cfgWifiPass = pass;
}

// Persiste las credenciales MQTT entregadas por el backend.
void guardarCredencialesMqtt(const String& user, const String& pass) {
  prefs.begin("iot_cfg", false);
  prefs.putString("mqtt_user", user);
  prefs.putString("mqtt_pass", pass);
  prefs.putBool("provisionado", true);
  prefs.end();
  cfgMqttUser = user;
  cfgMqttPass = pass;
  cfgProvisionado = true;
}

// Genera una identidad estable a partir de la MAC del ESP32 si aún no existe.
void generarUuidDispositivo() {
  prefs.begin("iot_cfg", true);
  cfgDeviceUuid = prefs.getString("device_uuid", ""); // Buscar UUID existente
  prefs.end();

  if (cfgDeviceUuid.length() > 0) return; // ya existe, no se regenera

  // Identificador por chip
  uint64_t chipid = ESP.getEfuseMac(); // MAC única grabada en el chip
  char buf[13];
  snprintf(buf, sizeof(buf), "%04X%08X", // Formatear MAC como hexadecimal
           (uint16_t)(chipid >> 32), (uint32_t)chipid);
  cfgDeviceUuid = "esp32-" + String(buf); // UUID final con prefijo

  prefs.begin("iot_cfg", false);
  prefs.putString("device_uuid", cfgDeviceUuid); // Guardarlo
  prefs.end();
}

// ESTADOS
// Flujo de aprovisionamiento: BLE -> WiFi -> portal -> operación normal.
enum Estado { ESPERANDO_BLE, CONECTANDO_WIFI, PORTAL_WEB, OPERACION_NORMAL };
Estado estadoActual = ESPERANDO_BLE; // Estado inicial

volatile bool credencialesWifiRecibidas = false;
String ssidRecibidoBLE; // SSID recibido por Bluetooth
String passRecibidoBLE; // Clave recibida por Bluetooth

unsigned long inicioIntentoWifi = 0;
const unsigned long TIMEOUT_WIFI_MS = 20000; // Tiempo máximo de cada intento WiFi.

bool registroCompletado = false; // True al vincular con backend

// HORA DEL DISPOSITIVO
const char* ZONA_HORARIA = "COT5"; // COT5 (UTC-05:00).
// Servidores de hora de respaldo
const char* SERVIDOR_NTP_1 = "pool.ntp.org"; 
const char* SERVIDOR_NTP_2 = "time.nist.gov";
const char* SERVIDOR_NTP_3 = "time.google.com";
const time_t EPOCH_MINIMO_VALIDO = 1704067200; // Umbral para distinguir una hora no inicializada.
const unsigned long INTERVALO_LOG_HORA_MS = 30000;
unsigned long ultimoLogHoraNoSincronizada = 0;
bool relojSincronizado = false; // True si NTP ya respondió
bool wifiEstabaConectado = false; // Detecta reconexiones WiFi
unsigned long ultimoIntentoReconectarWifi = 0; // Controla reintentos de WiFi

// Solicita la hora a los servidores NTP en el orden indicado.
void iniciarSincronizacionHora() {
  configTzTime(ZONA_HORARIA, SERVIDOR_NTP_1, SERVIDOR_NTP_2, SERVIDOR_NTP_3); // Pedir hora NTP
  relojSincronizado = false;
  Serial.println("Sincronizando hora NTP...");
}

// Considera válida la hora cuando supera el umbral mínimo configurado.
bool horaSincronizada() {
  struct timeval ahora;
  gettimeofday(&ahora, nullptr); // Leer reloj interno
  const bool valida = ahora.tv_sec >= EPOCH_MINIMO_VALIDO; // Fecha razonable = sincronizada
  if (valida && !relojSincronizado) { // Solo avisar la primera vez
    relojSincronizado = true;
    Serial.println("Hora sincronizada correctamente");
  }
  return valida;
}

// Convierte segundos y microsegundos del reloj del sistema a milisegundos.
uint64_t obtenerTimestampActualMs() {
  struct timeval ahora;
  gettimeofday(&ahora, nullptr);
  return (static_cast<uint64_t>(ahora.tv_sec) * 1000ULL) +
         (static_cast<uint64_t>(ahora.tv_usec) / 1000ULL);
}

// BLUETOOTH (BLE) - RECEPCION DE CREDENCIALES WIFI
#define SERVICE_UUID    "4fafc201-1fb5-459e-8fcc-c5c9c331914b" // UUID del servicio BLE
#define CHAR_WIFI_UUID  "beb5483e-36e1-4688-b7f5-ea07361b26a8"  // recibe WiFi
#define CHAR_ESTADO_UUID "0972ef8c-7613-4075-ad52-756f33d4da91" // informa estado

BLECharacteristic* caracteristicaEstado = nullptr; // Puntero para notificar al celular

// Envía al móvil el estado BLE como un pequeño objeto JSON.
void actualizarEstadoBLE(const String& estado, const String& info = "") {
  if (!caracteristicaEstado) return;

  StaticJsonDocument<256> doc;
  doc["estado"] = estado;
  if (info.length() > 0) doc["info"] = info;

  String salida;
  serializeJson(doc, salida);

  caracteristicaEstado->setValue(salida.c_str());
  caracteristicaEstado->notify();
}

// Recibe por BLE un JSON con las claves ssid y password.
class CallbackWifiBLE: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* car) override {
    String valor = car->getValue().c_str();

    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, valor);

    if (err || !doc.containsKey("ssid") || !doc.containsKey("password")) {
      actualizarEstadoBLE("error", "se espera JSON {ssid,password}");
      return;
    }

    ssidRecibidoBLE = doc["ssid"].as<String>();
    passRecibidoBLE = doc["password"].as<String>();
    credencialesWifiRecibidas = true;

    actualizarEstadoBLE("recibido");
  }
};

// Crea el servicio BLE, sus características y comienza la publicidad.
void iniciarBLE() {
  BLEDevice::init(("ESP32-" + cfgDeviceUuid).c_str());
  BLEDevice::setMTU(247); // margen para SSID/password largos

  BLEServer* servidor = BLEDevice::createServer();
  BLEService* servicio = servidor->createService(SERVICE_UUID);

  BLECharacteristic* charWifi = servicio->createCharacteristic(
    CHAR_WIFI_UUID, BLECharacteristic::PROPERTY_WRITE
  );
  charWifi->setCallbacks(new CallbackWifiBLE());

  caracteristicaEstado = servicio->createCharacteristic(
    CHAR_ESTADO_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  caracteristicaEstado->addDescriptor(new BLE2902());

  servicio->start();

  BLEAdvertising* publicidad = BLEDevice::getAdvertising();
  publicidad->addServiceUUID(SERVICE_UUID);
  publicidad->start();

  actualizarEstadoBLE("esperando_wifi");

  Serial.println("BLE activo. Escribe {\"ssid\":\"...\",\"password\":\"...\"} en la caracteristica de WiFi.");
  Serial.println("(Se puede probar con cualquier app generica de BLE, ej. nRF Connect / LightBlue)");
}

// Pagina WEB - DATOS DEL USUARIO
WebServer servidorWeb(80);

const char* PAGINA_HTML =
  "<!DOCTYPE html><html><head><meta charset='utf-8'>"
  "<meta name='viewport' content='width=device-width, initial-scale=1'>"
  "<title>Configurar dispositivo</title>"
  "<style>body{font-family:sans-serif;max-width:420px;margin:40px auto;padding:0 16px;text-align:center}"
  "input{width:100%;padding:14px;margin:16px 0;box-sizing:border-box;font-size:28px;text-align:center;letter-spacing:6px}"
  "button{width:100%;padding:12px;background:#2563eb;color:#fff;border:0;border-radius:6px;font-size:16px}"
  "</style></head><body>"
  "<h2>Vincular dispositivo</h2>"
  "<p>Ingresa el codigo de 6 digitos que generaste en tu cuenta</p>"
  "<form action='/registrar' method='POST'>"
  "<input type='text' name='codigo' inputmode='numeric' pattern='[0-9]{6}' maxlength='6' placeholder='000000' required>"
  "<button type='submit'>Vincular</button>"
  "</form></body></html>";

// Sirve la página que permite introducir el código de vinculación.
void manejarRaizWeb() {
  servidorWeb.send(200, "text/html", PAGINA_HTML);
}

bool registrarEnBackend(const String& codigo); // fwd decl

// Procesa el código recibido y solicita al backend las credenciales MQTT.
void manejarRegistroWeb() {
  if (!servidorWeb.hasArg("codigo")) {
    servidorWeb.send(400, "text/plain", "Falta el codigo");
    return;
  }

  bool ok = registrarEnBackend(servidorWeb.arg("codigo"));

  if (ok) {
    servidorWeb.send(200, "text/html",
      "<p>Dispositivo vinculado. El equipo se va a reiniciar en unos segundos.</p>");
    registroCompletado = true;
  } else {
    servidorWeb.send(200, "text/html",
      "<p>Codigo invalido o vencido. <a href=\"/\">Volver a intentar</a></p>");
  }
}

// Registra las rutas HTTP y deja disponible el portal local.
void iniciarPortalWeb() {
  servidorWeb.on("/", manejarRaizWeb);
  servidorWeb.on("/registrar", HTTP_POST, manejarRegistroWeb);
  servidorWeb.begin();

  Serial.print("Portal web activo en: http://");
  Serial.println(WiFi.localIP());

  actualizarEstadoBLE("wifi_ok", WiFi.localIP().toString());
}

// REGISTRO EN EL BACKEND
// Vincula el dispositivo y guarda las credenciales MQTT devueltas.
bool registrarEnBackend(const String& codigo) {
  HTTPClient http;
  String url = "http://" + String(BACKEND_HOST) + ":" + String(BACKEND_PORT) + BACKEND_REGISTRO_PATH;

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> cuerpo;
  cuerpo["uuid_esp32"] = cfgDeviceUuid;
  cuerpo["codigo"] = codigo;

  String cuerpoStr;
  serializeJson(cuerpo, cuerpoStr);

  int codigoHttp = http.POST(cuerpoStr);

  // El backend legado responde 200 y la API versionada responde 201.
  if (codigoHttp != 200 && codigoHttp != 201) {
    Serial.printf("Registro fallo, codigo=%d\n", codigoHttp);
    Serial.println(http.getString());
    http.end();
    return false;
  }

  StaticJsonDocument<256> respuesta;
  DeserializationError err = deserializeJson(respuesta, http.getString());
  http.end();

  if (err) {
    Serial.println("Respuesta del backend invalida");
    return false;
  }

  guardarCredencialesMqtt(
    respuesta["mqtt_username"].as<String>(),
    respuesta["mqtt_password"].as<String>()
  );

  Serial.println("Dispositivo registrado, credenciales MQTT guardadas");
  return true;
}

// MQTT - TOPICS DINAMICOS (segun el uuid del dispositivo)
String topicMediciones() { return "casa/" + cfgDeviceUuid + "/mediciones"; }
String topicEstado()     { return "casa/" + cfgDeviceUuid + "/estado"; }
String topicCmd()        { return "casa/" + cfgDeviceUuid + "/comandos"; }

WiFiClientSecure net;
MQTTClient client(1024);

const unsigned long sendInterval = 5000;
unsigned long lastSend = 0;
uint32_t messageId = 0;

const int MAX_COLA = 20; // Paquetes retenidos mientras MQTT no está disponible.
struct Paquete { uint32_t id; String json; };
Paquete cola[MAX_COLA];
int colaInicio = 0, colaFin = 0, colaCantidad = 0;

bool colaVacia() { return colaCantidad == 0; }
bool colaLlena() { return colaCantidad == MAX_COLA; }

// Añade un paquete a una cola circular; si se llena, descarta el más antiguo.
void encolar(String json) {
  if (colaLlena()) {
    Serial.printf("Cola llena; se descarta el paquete id=%lu\n",
                  (unsigned long)cola[colaInicio].id);
    colaInicio = (colaInicio + 1) % MAX_COLA;
    colaCantidad--;
  }
  const uint32_t idCola = ++messageId;

  // Se conserva el paquete original para no informar al backend que fue encolado.
  cola[colaFin].json = json;

  cola[colaFin].id = idCola;
  colaFin = (colaFin + 1) % MAX_COLA;
  colaCantidad++;
  Serial.printf("Paquete encolado: id=%lu pendientes=%d\n",
                (unsigned long)idCola, colaCantidad);
}

bool desencolar() {
  if (colaVacia()) return false;
  colaInicio = (colaInicio + 1) % MAX_COLA;
  colaCantidad--;
  return true;
}

// Publica el primer paquete pendiente y lo retira solo si MQTT confirma el envío.
void enviarPendiente() {
  if (colaVacia() || !client.connected()) return;
  if (client.publish(topicMediciones(), cola[colaInicio].json, false, 1)) {
    Serial.printf("Paquete encolado publicado: id=%lu pendientes_antes=%d\n",
                  (unsigned long)cola[colaInicio].id, colaCantidad);
    desencolar();
  }
}

void alRecibirMensaje(String &topic, String &payload) {
  Serial.println("Comando MQTT recibido: " + payload);
}

unsigned long ultimoIntentoMQTT = 0;

// Reintenta la conexión MQTT con una separación mínima de cinco segundos.
void reconectarMQTT() {
  if (millis() - ultimoIntentoMQTT < 5000) return;
  ultimoIntentoMQTT = millis();

  if (client.connect(cfgDeviceUuid.c_str(), cfgMqttUser.c_str(), cfgMqttPass.c_str())) {
    Serial.println("MQTT conectado");
    client.publish(topicEstado(), "online", true, 1);
    client.subscribe(topicCmd(), 1);
  } else {
    Serial.printf("MQTT fallo (error=%d)\n", client.lastError());
  }
}

// GENERACION DE DATOS SIMULADOS (igual que antes)
float energiaAcumulada[MAX_MEDIDORES] = {0.0, 0.0};

// Genera valores aleatorios con tres decimales de precisión.
float randomFloat(float minimo, float maximo) {
  long valor = random((long)(minimo * 1000), (long)(maximo * 1000));
  return valor / 1000.0;
}

// Calcula una medición de prueba y acumula su energía aproximada.
void generarMedicionSimulada(int circuito, float &voltaje, float &corriente,
                              float &potencia, float &energia,
                              float &factorPotencia) {
  voltaje = randomFloat(118.0, 125.0);
  corriente = (circuito == 1) ? randomFloat(0.5, 5.0) : randomFloat(0.2, 3.5);
  factorPotencia = randomFloat(0.80, 0.99);
  potencia = voltaje * corriente * factorPotencia;

  const float horas = sendInterval / 3600000.0;
  energiaAcumulada[circuito] += (potencia * horas) / 1000.0;
  energia = energiaAcumulada[circuito];
}

// Construye el paquete JSON con la medición de cada circuito simulado.
String construirJsonMediciones() {
  DynamicJsonDocument doc(2048);
  const uint64_t timestampPaquete = obtenerTimestampActualMs();
  doc["timestamp_ms"] = timestampPaquete;
  JsonArray medidores = doc.createNestedArray("medidores");

  for (int i = 0; i < MAX_MEDIDORES; i++) {
    float v, c, p, e, fp;
    generarMedicionSimulada(i, v, c, p, e, fp);

    JsonObject m = medidores.createNestedObject();
    m["circuito"] = i + 1;
    m["timestamp_ms"] = obtenerTimestampActualMs();
    m["voltaje"] = v;
    m["corriente"] = c;
    m["potencia"] = p;
    m["energia"] = e;
    m["factor_potencia"] = fp;
  }

  String salida;
  serializeJson(doc, salida);
  return salida;
}

// SETUP
// Inicializa hardware, configuración persistente y cliente MQTT.
void setup() {
  Serial.begin(115200);
  delay(1000);
  randomSeed(analogRead(34) + micros());

  generarUuidDispositivo();
  cargarConfiguracion();

  Serial.println();
  Serial.println("   ESP32 - MONITOREO ENERGETICO IoT");
  Serial.println("   UUID del dispositivo: " + cfgDeviceUuid);

  net.setCACert(CA_CERT); // valida que el broker sea el tuyo (evita MITM)
  client.begin(MQTT_BROKER_HOST, MQTT_BROKER_PORT, net);
  client.onMessage(alRecibirMensaje);

  if (cfgProvisionado && cfgWifiSsid.length() > 0) {
    Serial.println("Configuracion previa encontrada, conectando directo...");
    WiFi.begin(cfgWifiSsid.c_str(), cfgWifiPass.c_str());
    inicioIntentoWifi = millis();
    estadoActual = CONECTANDO_WIFI;
  } else {
    Serial.println("Sin configuracion previa, iniciando Bluetooth...");
    iniciarBLE();
    estadoActual = ESPERANDO_BLE;
  }
}

// LOOP
// Ejecuta el estado actual del dispositivo y sus tareas de comunicación.
void loop() {
  switch (estadoActual) {

    case ESPERANDO_BLE:
      if (credencialesWifiRecibidas) {
        credencialesWifiRecibidas = false;
        guardarWifi(ssidRecibidoBLE, passRecibidoBLE);
        actualizarEstadoBLE("conectando");
        WiFi.begin(cfgWifiSsid.c_str(), cfgWifiPass.c_str());
        inicioIntentoWifi = millis();
        estadoActual = CONECTANDO_WIFI;
      }
      break;

    case CONECTANDO_WIFI:
      if (WiFi.status() == WL_CONNECTED) {
        Serial.println("WiFi conectado, IP: " + WiFi.localIP().toString());
        iniciarSincronizacionHora();

        if (cfgProvisionado) {
          estadoActual = OPERACION_NORMAL;
        } else {
          iniciarPortalWeb();
          estadoActual = PORTAL_WEB;
        }
      } else if (millis() - inicioIntentoWifi > TIMEOUT_WIFI_MS) {
        Serial.println("No se pudo conectar al WiFi, reintenta por Bluetooth.");
        actualizarEstadoBLE("error_wifi");
        estadoActual = ESPERANDO_BLE;
      }
      break;

    case PORTAL_WEB:
      servidorWeb.handleClient();
      if (registroCompletado) {
        delay(1000); // da tiempo a que el navegador reciba la respuesta
        ESP.restart();
      }
      break;

    case OPERACION_NORMAL:
      // Mantiene WiFi/MQTT, sincroniza la hora y publica o encola mediciones.
      if (WiFi.status() != WL_CONNECTED) {
        wifiEstabaConectado = false;
        relojSincronizado = false;
        if (millis() - ultimoIntentoReconectarWifi >= 5000) {
          ultimoIntentoReconectarWifi = millis();
          Serial.println("WiFi desconectado, intentando reconectar...");
          WiFi.reconnect();
        }
        break;
      }

      if (!wifiEstabaConectado) {
        wifiEstabaConectado = true;
        iniciarSincronizacionHora();
      }

      client.loop();
      if (!client.connected()) reconectarMQTT();

      enviarPendiente();

      if (!horaSincronizada()) {
        if (millis() - ultimoLogHoraNoSincronizada >= INTERVALO_LOG_HORA_MS) {
          ultimoLogHoraNoSincronizada = millis();
          Serial.println("Hora NTP todavía no está sincronizada; se espera antes de crear mediciones");
        }
        break;
      }

      if (millis() - lastSend >= sendInterval) {
        lastSend = millis();
        String paquete = construirJsonMediciones();

        bool ok = client.connected() &&
                  client.publish(topicMediciones(), paquete, false, 1);

        if (ok) {
          Serial.println("Medicion publicada: " + paquete);
        } else {
          Serial.println("Sin conexion, se encola");
          encolar(paquete);
        }
      }
      break;
  }
}
