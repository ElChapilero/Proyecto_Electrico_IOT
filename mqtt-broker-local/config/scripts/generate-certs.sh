#!/bin/bash
# Genera (o regenera) los certificados TLS del broker Mosquitto.

set -e
IP="${1:?Uso: ./config/scripts/generate-certs.sh <IP_DEL_BROKER>}"

# 1. Cambiamos el directorio de trabajo a config/certs
cd "$(dirname "$0")/../certs"

if [ ! -f ca.key ]; then
  echo "Generando CA nueva..."
  openssl genrsa -out ca.key 4096
  # 2. Doble slash en //CN para evitar la conversión de rutas en Git Bash
  openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 \
    -subj "//CN=IoT Local CA" -out ca.crt
else
  echo "Reutilizando CA existente (ca.key / ca.crt)"
fi

echo "Generando certificado de servidor para IP=$IP ..."
openssl genrsa -out server.key 2048
openssl req -new -key server.key -subj "//CN=$IP" -out server.csr
printf "subjectAltName = IP:%s,DNS:localhost,IP:127.0.0.1\n" "$IP" > server.ext
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -days 825 -sha256 -extfile server.ext
rm -f server.csr server.ext

echo ""
echo "Listo. Los certificados se han guardado correctamente en config/certs/"
echo "server.crt ahora vale para: $IP, localhost, 127.0.0.1"
echo "docker restart mqtt-broker-local para que el broker lo tome."