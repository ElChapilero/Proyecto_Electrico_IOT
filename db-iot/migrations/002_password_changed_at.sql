-- Permite invalidar tokens emitidos antes de cambiar la contraseña.
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
