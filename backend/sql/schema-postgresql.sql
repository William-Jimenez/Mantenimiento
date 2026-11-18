-- =============================================================================
-- ESQUEMA RELACIONAL POSTGRESQL 16 - PLATAFORMA DE SOLICITUDES DE MANTENIMIENTO
-- Cumple 3FN, Integridad Referencial (ON DELETE RESTRICT) y Bloqueo Optimista
-- =============================================================================

CREATE TABLE IF NOT EXISTS empleado (
    id BIGSERIAL PRIMARY KEY,
    documento VARCHAR(20) NOT NULL UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    cargo VARCHAR(100) NOT NULL,
    es_tecnico BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuario (
    id BIGSERIAL PRIMARY KEY,
    empleado_id BIGINT NOT NULL UNIQUE REFERENCES empleado(id) ON DELETE RESTRICT,
    perfil VARCHAR(20) NOT NULL CHECK (perfil IN ('ADMINISTRADOR', 'EMPLEADO', 'CLIENTE')),
    password_hash VARCHAR(150) NOT NULL,
    debe_cambiar_password BOOLEAN NOT NULL DEFAULT FALSE,
    intentos_fallidos SMALLINT NOT NULL DEFAULT 0,
    bloqueado_hasta TIMESTAMP NULL,
    ultimo_acceso TIMESTAMP NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tipo_recurso (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS recurso (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    tipo_recurso_id BIGINT NOT NULL REFERENCES tipo_recurso(id) ON DELETE RESTRICT,
    ubicacion VARCHAR(200) NOT NULL,
    descripcion VARCHAR(500) NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categoria (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    activa BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS prioridad (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(20) NOT NULL UNIQUE,
    nivel SMALLINT NOT NULL UNIQUE,
    descripcion VARCHAR(200) NOT NULL
);

CREATE TABLE IF NOT EXISTS estado (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE,
    es_final BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS solicitud (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    solicitante_id BIGINT NOT NULL REFERENCES empleado(id) ON DELETE RESTRICT,
    registrada_por_usuario_id BIGINT NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    recurso_id BIGINT NOT NULL REFERENCES recurso(id) ON DELETE RESTRICT,
    descripcion VARCHAR(2000) NOT NULL,
    estado_id BIGINT NOT NULL REFERENCES estado(id) ON DELETE RESTRICT,
    categoria_id BIGINT NULL REFERENCES categoria(id) ON DELETE RESTRICT,
    prioridad_id BIGINT NULL REFERENCES prioridad(id) ON DELETE RESTRICT,
    trabajo_realizado VARCHAR(2000) NULL,
    trabajo_actualizado_en TIMESTAMP NULL,
    motivo_cierre VARCHAR(500) NULL,
    creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cerrada_en TIMESTAMP NULL,
    version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS evidencia (
    id BIGSERIAL PRIMARY KEY,
    solicitud_id BIGINT NOT NULL REFERENCES solicitud(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('FOTOGRAFIA', 'PDF')),
    nombre_original VARCHAR(255) NOT NULL,
    nombre_almacenado VARCHAR(40) NOT NULL UNIQUE,
    tipo_mime VARCHAR(100) NOT NULL,
    tamano_bytes INTEGER NOT NULL,
    hash_sha256 VARCHAR(64) NOT NULL,
    subida_por_usuario_id BIGINT NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    subida_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asignacion (
    id BIGSERIAL PRIMARY KEY,
    solicitud_id BIGINT NOT NULL REFERENCES solicitud(id) ON DELETE RESTRICT,
    tecnico_id BIGINT NOT NULL REFERENCES empleado(id) ON DELETE RESTRICT,
    asignada_por_usuario_id BIGINT NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    asignada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    vigente BOOLEAN NOT NULL DEFAULT TRUE,
    finalizada_en TIMESTAMP NULL,
    motivo_fin VARCHAR(300) NULL
);

CREATE TABLE IF NOT EXISTS analisis_ia (
    id BIGSERIAL PRIMARY KEY,
    solicitud_id BIGINT NOT NULL REFERENCES solicitud(id) ON DELETE RESTRICT,
    version INTEGER NOT NULL,
    estado_analisis VARCHAR(20) NOT NULL DEFAULT 'EN_COLA' CHECK (estado_analisis IN ('EN_COLA', 'COMPLETADO', 'FALLIDO')),
    tipo_dano VARCHAR(200) NULL,
    descripcion_observada TEXT NULL,
    categoria_sugerida_id BIGINT NULL REFERENCES categoria(id) ON DELETE RESTRICT,
    prioridad_sugerida_id BIGINT NULL REFERENCES prioridad(id) ON DELETE RESTRICT,
    modelo VARCHAR(100) NULL,
    solicitado_por_usuario_id BIGINT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completado_en TIMESTAMP NULL,
    error_detalle VARCHAR(500) NULL,
    decision_revision VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (decision_revision IN ('PENDIENTE', 'ACEPTADO', 'MODIFICADO', 'DESCARTADO')),
    revisado_por_usuario_id BIGINT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    revisado_en TIMESTAMP NULL,
    CONSTRAINT uq_analisis_solicitud_version UNIQUE (solicitud_id, version)
);

CREATE TABLE IF NOT EXISTS historial_estado (
    id BIGSERIAL PRIMARY KEY,
    solicitud_id BIGINT NOT NULL REFERENCES solicitud(id) ON DELETE RESTRICT,
    estado_anterior_id BIGINT NULL REFERENCES estado(id) ON DELETE RESTRICT,
    estado_nuevo_id BIGINT NOT NULL REFERENCES estado(id) ON DELETE RESTRICT,
    usuario_id BIGINT NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    cambiado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    motivo VARCHAR(500) NULL
);

-- Índices estratégicos y garantía de asignación única vigente en PostgreSQL
CREATE UNIQUE INDEX IF NOT EXISTS uq_asignacion_vigente ON asignacion (solicitud_id) WHERE vigente = TRUE;
CREATE INDEX IF NOT EXISTS idx_solicitud_estado_fecha ON solicitud (estado_id, creada_en DESC);
CREATE INDEX IF NOT EXISTS idx_solicitud_solicitante_fecha ON solicitud (solicitante_id, creada_en DESC);
CREATE INDEX IF NOT EXISTS idx_asignacion_tecnico_vigente ON asignacion (tecnico_id, vigente);
CREATE INDEX IF NOT EXISTS idx_evidencia_solicitud ON evidencia (solicitud_id);
CREATE INDEX IF NOT EXISTS idx_historial_solicitud_fecha ON historial_estado (solicitud_id, cambiado_en ASC);
