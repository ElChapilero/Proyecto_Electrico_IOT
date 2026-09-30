[CmdletBinding()]
param(
    [string]$BrokerIp = "127.0.0.1",
    [switch]$SkipCertificates
)

$ErrorActionPreference = "Stop"
$brokerRoot = (Resolve-Path (Join-Path $PSScriptRoot ".")).Path
$configDir = Join-Path $brokerRoot "config"
$certDir = Join-Path $configDir "certs"
$dataDir = Join-Path $brokerRoot "data"
$logDir = Join-Path $brokerRoot "log"

New-Item -ItemType Directory -Force -Path $certDir, $dataDir, $logDir | Out-Null

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker no está disponible en PATH. Instala/inicia Docker Desktop y vuelve a ejecutar este script."
}

if (-not $SkipCertificates -and -not (Test-Path (Join-Path $certDir "ca.crt"))) {
    Write-Host "Generando certificados TLS dentro de un contenedor temporal..."
    $certPath = (Resolve-Path $certDir).Path
    $certCommand = @"
set -eu
if [ ! -f /certs/ca.key ]; then
  openssl genrsa -out /certs/ca.key 4096
  openssl req -x509 -new -nodes -key /certs/ca.key -sha256 -days 3650 \
    -subj '/CN=IoT Local CA' -out /certs/ca.crt
fi
openssl genrsa -out /certs/server.key 2048
openssl req -new -key /certs/server.key -subj '/CN=$BrokerIp' -out /tmp/server.csr
printf 'subjectAltName = IP:$BrokerIp,DNS:localhost,IP:127.0.0.1\n' > /tmp/server.ext
openssl x509 -req -in /tmp/server.csr -CA /certs/ca.crt -CAkey /certs/ca.key \
  -CAcreateserial -out /certs/server.crt -days 825 -sha256 -extfile /tmp/server.ext
rm -f /tmp/server.csr /tmp/server.ext
chmod 600 /certs/*.key
"@
    & docker run --rm --entrypoint /bin/sh -v "${certPath}:/certs" alpine/openssl:3.3.2 -c $certCommand
}

$aclFile = Join-Path $configDir "acl.conf"
if (-not (Test-Path $aclFile)) {
    Copy-Item (Join-Path $configDir "acl.conf.example") $aclFile
    Write-Host "Creado config/acl.conf desde el ejemplo."
}

$passwdFile = Join-Path $configDir "passwd"
if (-not (Test-Path $passwdFile)) {
    Write-Host "Creando el usuario MQTT del backend. Escribe la contraseña cuando Mosquitto la solicite."
    Push-Location $brokerRoot
    try {
        & docker compose run --rm --no-deps mosquitto mosquitto_passwd -c /mosquitto/config/passwd backend_listener
        if ($LASTEXITCODE -ne 0) { throw "No se pudo crear config/passwd." }
    } finally {
        Pop-Location
    }
    Write-Host "Copia esa misma contraseña en backend-iot/.env como MQTT_LISTENER_PASSWORD."
}

Write-Host "Inicialización terminada. Siguiente paso: docker compose up -d en $brokerRoot"
