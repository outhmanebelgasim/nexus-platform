-- ==========================================
-- Enable TimescaleDB Extension
-- ==========================================

CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ==========================================
-- Farms
-- ==========================================

CREATE TABLE farms (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    location VARCHAR(255),
    description TEXT,
    google_maps_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- ==========================================
-- Users
-- ==========================================

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL,
    enabled BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- ==========================================
-- Stations
-- ==========================================

CREATE TABLE stations (
    id BIGSERIAL PRIMARY KEY,
    farm_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    altitude DOUBLE PRECISION,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,

    CONSTRAINT fk_stations_farm
        FOREIGN KEY (farm_id)
        REFERENCES farms(id)
        ON DELETE CASCADE
);

-- ==========================================
-- Sensors
-- ==========================================

CREATE TABLE sensors (
    id BIGSERIAL PRIMARY KEY,
    station_id BIGINT NOT NULL,
    code VARCHAR(150) UNIQUE NOT NULL,
    name VARCHAR(150),
    sensor_type VARCHAR(80) NOT NULL,
    unit VARCHAR(30),
    depth_cm INTEGER,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,

    CONSTRAINT fk_sensor_station
        FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE CASCADE
);

-- ==========================================
-- Measurements
-- ==========================================

CREATE TABLE measurements (
    time TIMESTAMPTZ NOT NULL,
    sensor_id BIGINT NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    quality VARCHAR(30) NOT NULL DEFAULT 'VALID',
    import_batch_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (time, sensor_id),

    CONSTRAINT fk_measurement_sensor
        FOREIGN KEY (sensor_id)
        REFERENCES sensors(id)
        ON DELETE CASCADE
);

-- Convert measurements into a TimescaleDB hypertable
SELECT create_hypertable(
    'measurements',
    'time',
    if_not_exists => TRUE
);

-- ==========================================
-- Import Logs
-- ==========================================

CREATE TABLE import_logs (
    id BIGSERIAL PRIMARY KEY,
    batch_id UUID NOT NULL UNIQUE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT,
    status VARCHAR(30) NOT NULL,
    total_rows INTEGER,
    imported_rows INTEGER,
    skipped_rows INTEGER,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ
);

-- ==========================================
-- Alerts
-- ==========================================

CREATE TABLE alerts (
    id BIGSERIAL PRIMARY KEY,
    sensor_id BIGINT NOT NULL,
    alert_type VARCHAR(80) NOT NULL,
    severity VARCHAR(30) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(30) NOT NULL,
    triggered_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ,

    CONSTRAINT fk_alert_sensor
        FOREIGN KEY (sensor_id)
        REFERENCES sensors(id)
        ON DELETE CASCADE
);

-- ==========================================
-- Useful Indexes
-- ==========================================

CREATE INDEX idx_station_farm
ON stations(farm_id);

CREATE INDEX idx_sensor_station
ON sensors(station_id);

CREATE INDEX idx_measurement_sensor_time
ON measurements(sensor_id, time DESC);

CREATE INDEX idx_alert_sensor_status
ON alerts(sensor_id, status);
