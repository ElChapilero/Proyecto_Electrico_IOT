#include <WiFi.h>
#include <Preferences.h>
#include "esp_wifi.h"

// Borrar la configuración del firmware_esp32.ino:
Preferences preferencias;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("   BORRADO DE CONFIGURACION DEL ESP32");

  // Borra la configuración persistente de la librería WiFi.
  WiFi.mode(WIFI_STA);
  bool wifiBorrado = WiFi.disconnect(true, true);
  delay(300);

  // Borra únicamente el namespace creado por este proyecto.
  bool nvsBorrado = false;
  if (preferencias.begin("iot_cfg", false)) {
    nvsBorrado = preferencias.clear();
    preferencias.end();
  }

  // Refuerzo para eliminar la configuración WiFi almacenada por ESP-IDF.
  esp_err_t restauracionWifi = esp_wifi_restore();
}

void loop() {
  delay(1000);
}
