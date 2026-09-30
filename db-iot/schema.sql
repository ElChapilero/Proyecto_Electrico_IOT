CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- TABLA: USUARIOS

CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    password_hash TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- La unicidad del correo debe ser independiente de mayúsculas/minúsculas.
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_email_lower ON usuarios (LOWER(email));

-- TABLA: PREDIOS

CREATE TABLE predios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nombre TEXT NOT NULL,
    tipo_predio TEXT NOT NULL DEFAULT 'Casa',

    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_predio_tipo
        CHECK (tipo_predio IN ('Casa'))
);

-- TABLA: ACCESOS_PREDIO

CREATE TABLE accesos_predio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    id_predio UUID NOT NULL,
    id_usuario UUID NOT NULL,

    rol TEXT NOT NULL DEFAULT 'lector',

    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_acceso_predio
        FOREIGN KEY (id_predio)
        REFERENCES predios(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_acceso_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_acceso_predio_usuario
        UNIQUE (id_predio, id_usuario),

    CONSTRAINT chk_acceso_rol
        CHECK (rol IN ('administrador', 'lector'))
);

CREATE INDEX idx_accesos_predio ON accesos_predio(id_predio);
CREATE INDEX idx_accesos_usuario ON accesos_predio(id_usuario);

-- TABLA: PANELES_ELECTRICOS

CREATE TABLE paneles_electricos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    id_predio UUID NOT NULL,
    id_panel_principal UUID,

    nombre TEXT NOT NULL,
    tipo_panel TEXT NOT NULL DEFAULT 'Principal',

    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_panel_predio
        FOREIGN KEY (id_predio)
        REFERENCES predios(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_panel_principal
        FOREIGN KEY (id_panel_principal)
        REFERENCES paneles_electricos(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_panel_tipo
        CHECK (tipo_panel IN ('Principal', 'Secundario')),

    CONSTRAINT chk_panel_principal_secundario
        CHECK (
            (tipo_panel = 'Principal' AND id_panel_principal IS NULL)
            OR
            (tipo_panel = 'Secundario' AND id_panel_principal IS NOT NULL)
        )
);

CREATE INDEX idx_paneles_predio ON paneles_electricos(id_predio);
CREATE INDEX idx_paneles_tipo ON paneles_electricos(tipo_panel);
CREATE INDEX idx_paneles_panel_principal ON paneles_electricos(id_panel_principal);

-- TABLA: DISPOSITIVOS

CREATE TABLE dispositivos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    id_panel UUID NOT NULL,

    uuid_esp32 TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,

    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_dispositivo_panel
        FOREIGN KEY (id_panel)
        REFERENCES paneles_electricos(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_dispositivos_panel ON dispositivos(id_panel);

-- TABLA: CIRCUITOS

CREATE TABLE circuitos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    id_dispositivo UUID NOT NULL,

    nombre TEXT NOT NULL,
    estado BOOLEAN DEFAULT TRUE,
    indice SMALLINT NOT NULL,

    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_circuito_dispositivo
        FOREIGN KEY (id_dispositivo)
        REFERENCES dispositivos(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_dispositivo_indice
        UNIQUE (id_dispositivo, indice),

    CONSTRAINT chk_circuito_max_indice
        CHECK (indice BETWEEN 1 AND 4)
);

CREATE INDEX idx_circuitos_dispositivo ON circuitos(id_dispositivo);

-- TABLA: MEDICIONES

CREATE TABLE mediciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circuito_id UUID NOT NULL,
    potencia NUMERIC,
    energia NUMERIC,
    voltaje NUMERIC,
    corriente NUMERIC,
    frecuencia NUMERIC,
    factor_potencia NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT fk_medicion_circuito
        FOREIGN KEY (circuito_id)
        REFERENCES circuitos(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_mediciones_circuito ON mediciones(circuito_id);
CREATE INDEX idx_mediciones_fecha ON mediciones(created_at);
-- Las consultas históricas filtran por circuito y ordenan por fecha.
-- Aplicar en una migración de producción; no se ejecuta automáticamente.
CREATE INDEX IF NOT EXISTS idx_mediciones_circuito_fecha
    ON mediciones(circuito_id, created_at DESC, id DESC);

-- Agregado horario derivado. `mediciones` sigue siendo la fuente de verdad.
-- Las horas se almacenan como timestamptz alineado con America/Bogota.
CREATE TABLE IF NOT EXISTS mediciones_horarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circuito_id UUID NOT NULL,
    fecha_hora TIMESTAMPTZ NOT NULL,
    promedio_potencia NUMERIC,
    min_potencia NUMERIC,
    max_potencia NUMERIC,
    promedio_voltaje NUMERIC,
    min_voltaje NUMERIC,
    max_voltaje NUMERIC,
    promedio_corriente NUMERIC,
    min_corriente NUMERIC,
    max_corriente NUMERIC,
    promedio_frecuencia NUMERIC,
    min_frecuencia NUMERIC,
    max_frecuencia NUMERIC,
    promedio_factor_potencia NUMERIC,
    min_factor_potencia NUMERIC,
    max_factor_potencia NUMERIC,
    energia_inicial NUMERIC,
    energia_final NUMERIC,
    consumo_energia NUMERIC,
    energia_reset_detectado BOOLEAN NOT NULL DEFAULT FALSE,
    cantidad_muestras INTEGER NOT NULL,
    primera_lectura_at TIMESTAMPTZ NOT NULL,
    ultima_lectura_at TIMESTAMPTZ NOT NULL,
    calculado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    version_agregacion INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT fk_medicion_horaria_circuito
        FOREIGN KEY (circuito_id) REFERENCES circuitos(id) ON DELETE CASCADE,
    CONSTRAINT uq_medicion_horaria_circuito_hora
        UNIQUE (circuito_id, fecha_hora),
    CONSTRAINT chk_medicion_horaria_muestras CHECK (cantidad_muestras > 0)
);

CREATE INDEX IF NOT EXISTS idx_mediciones_horarias_circuito_fecha
    ON mediciones_horarias(circuito_id, fecha_hora DESC);

-- TABLA: CODIGOS_VINCULACION

CREATE TABLE codigos_vinculacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    id_panel UUID NOT NULL,

    codigo TEXT NOT NULL UNIQUE,
    usado BOOLEAN DEFAULT FALSE,
    expira_en TIMESTAMPTZ NOT NULL,

    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_codigo_panel
        FOREIGN KEY (id_panel)
        REFERENCES paneles_electricos(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_codigos_codigo ON codigos_vinculacion(codigo);

-- TABLA: CONFIGURACION_ALERTAS

CREATE TABLE configuracion_alertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    id_circuito UUID NOT NULL,

    nombre TEXT NOT NULL,
    tipo_variable TEXT NOT NULL,
    condicion TEXT NOT NULL,

    limite_minimo NUMERIC,
    limite_maximo NUMERIC,

    activa BOOLEAN NOT NULL DEFAULT TRUE,

    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_configuracion_alerta_circuito
        FOREIGN KEY (id_circuito)
        REFERENCES circuitos(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_configuracion_alerta_variable
        CHECK (
            tipo_variable IN (
                'potencia', 'energia', 'voltaje',
                'corriente', 'frecuencia', 'factor_potencia'
            )
        ),

    CONSTRAINT chk_configuracion_alerta_condicion
        CHECK (
            condicion IN ('MAYOR', 'MENOR', 'IGUAL', 'FUERA_RANGO')
        ),

    CONSTRAINT chk_configuracion_alerta_limites
        CHECK (
            (
                condicion IN ('MAYOR', 'MENOR', 'IGUAL')
                AND limite_minimo IS NOT NULL
            )
            OR
            (
                condicion = 'FUERA_RANGO'
                AND limite_minimo IS NOT NULL
                AND limite_maximo IS NOT NULL
                AND limite_minimo < limite_maximo
            )
        )
);

CREATE UNIQUE INDEX uq_configuracion_alerta_circuito_variable
ON configuracion_alertas(id_circuito, tipo_variable);

CREATE INDEX idx_configuracion_alertas_circuito
ON configuracion_alertas(id_circuito);

CREATE INDEX idx_configuracion_alertas_activa
ON configuracion_alertas(activa);


-- TABLA: ALERTAS

CREATE TABLE alertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    id_configuracion_alerta UUID,
    id_medicion UUID,

    tipo_variable TEXT NOT NULL,
    valor NUMERIC NOT NULL,

    limite_minimo NUMERIC,
    limite_maximo NUMERIC,

    ocurrido_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    revisada BOOLEAN NOT NULL DEFAULT FALSE,
    revisada_en TIMESTAMPTZ,

    CONSTRAINT fk_alerta_configuracion
        FOREIGN KEY (id_configuracion_alerta)
        REFERENCES configuracion_alertas(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_alerta_medicion
        FOREIGN KEY (id_medicion)
        REFERENCES mediciones(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_alerta_variable
        CHECK (
            tipo_variable IN (
                'potencia', 'energia', 'voltaje',
                'corriente', 'frecuencia', 'factor_potencia'
            )
        )
);

CREATE INDEX idx_alertas_configuracion ON alertas(id_configuracion_alerta);
CREATE INDEX idx_alertas_medicion ON alertas(id_medicion);
CREATE INDEX idx_alertas_ocurrido ON alertas(ocurrido_en);
