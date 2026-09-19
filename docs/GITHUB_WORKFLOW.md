# Flujo recomendado para subir el proyecto a GitHub

El proyecto está en desarrollo. Usa `develop` como rama de integración y
mantén `main` únicamente para versiones revisadas y utilizables.

## 1. Preparar el equipo que crea el repositorio

Desde `C:\proyecto_iot`:

```bash
git init
git config user.name "Tu nombre"
git config user.email "tu-correo@example.com"
git branch -M develop
```

Antes de agregar archivos, confirma que existen las exclusiones:

```bash
git check-ignore -v backend-iot/.env
git check-ignore -v esp32-firmware/firmware_config.h
git check-ignore -v mqtt-broker-local/config/certs/ca.key
git check-ignore -v mqtt-broker-local/config/passwd
```

Cada comando debe mostrar la regla del `.gitignore` que lo excluye.

## 2. Revisar qué se va a subir

Primero usa una previsualización:

```bash
git add --dry-run .
```

Después agrega el proyecto y revisa los nombres:

```bash
git add .
git status --short
git diff --cached --name-only
```

No continúes si aparecen `.env`, `firmware_config.h`, `passwd`, `acl.conf`,
`.key`, bases de datos o logs.

## 3. Crear el primer commit

```bash
git commit -m "chore: initial project structure"
```

En GitHub crea un repositorio vacío, sin README, `.gitignore` ni licencia
generados automáticamente. Luego conecta el repositorio:

```bash
git remote add origin https://github.com/USUARIO/REPOSITORIO.git
git push -u origin develop
```

El primer push debe ir a `develop`, porque el proyecto todavía necesita
correcciones.

## 4. Organización de ramas para dos personas

```text
main       versiones estables y revisadas
develop    integración del trabajo actual
feature/*  nuevas funcionalidades
bugfix/*   correcciones
```

Cada persona trabaja en su propia rama creada desde `develop`:

```bash
git switch develop
git pull origin develop
git switch -c feature/nombre-del-cambio
```

Después de trabajar:

```bash
git status
git add archivos-modificados
git commit -m "feat: descripcion breve del cambio"
git push -u origin feature/nombre-del-cambio
```

En GitHub se crea un Pull Request desde `feature/nombre-del-cambio` hacia
`develop`. La otra persona revisa el cambio y, si todo está correcto, lo
integra.

## 5. Actualizar una rama de trabajo

Antes de continuar trabajando:

```bash
git switch develop
git pull origin develop
git switch feature/nombre-del-cambio
git merge develop
```

Si aparecen conflictos, resuélvelos, verifica el proyecto y crea el commit de
resolución. No subas archivos locales de configuración para resolverlos.

## 6. Pasar una versión a main

Cuando `develop` esté probado:

1. Crear Pull Request de `develop` hacia `main`.
2. Revisar backend, frontend, firmware, SQL y configuración.
3. Confirmar que no haya secretos en los archivos modificados.
4. Aprobar y fusionar el Pull Request.
5. Crear un tag de versión, por ejemplo `v0.1.0`.

No trabajen directamente sobre `main`.

## Configuración del firmware

El firmware público está en `esp32-firmware/firmware_esp32.ino`. Antes de
compilar en cada equipo:

```bash
copy esp32-firmware\firmware_config.example.h esp32-firmware\firmware_config.h
```

Después completa `firmware_config.h` con la IP o host local, el puerto MQTT y
el certificado público `ca.crt`. Ese archivo está excluido por Git.
