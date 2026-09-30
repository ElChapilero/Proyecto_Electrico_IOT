-- Migración 001: agregación horaria derivada.
-- No elimina ni modifica las mediciones originales.
CREATE TABLE IF NOT EXISTS mediciones_horarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circuito_id UUID NOT NULL REFERENCES circuitos(id) ON DELETE CASCADE,
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
    cantidad_muestras INTEGER NOT NULL CHECK (cantidad_muestras > 0),
    primera_lectura_at TIMESTAMPTZ NOT NULL,
    ultima_lectura_at TIMESTAMPTZ NOT NULL,
    calculado_en TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    version_agregacion INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT uq_medicion_horaria_circuito_hora UNIQUE (circuito_id, fecha_hora)
);

CREATE INDEX IF NOT EXISTS idx_mediciones_horarias_circuito_fecha
    ON mediciones_horarias(circuito_id, fecha_hora DESC);
