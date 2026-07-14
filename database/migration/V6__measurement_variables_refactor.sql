-- ==========================================
-- Measurement variables replace sensors
-- ==========================================

ALTER TABLE measurements
    DROP CONSTRAINT IF EXISTS fk_measurement_sensor;

ALTER TABLE alerts
    DROP CONSTRAINT IF EXISTS fk_alert_sensor;

DROP INDEX IF EXISTS idx_measurement_sensor_time;
DROP INDEX IF EXISTS idx_alert_sensor_status;
DROP INDEX IF EXISTS idx_sensor_station;

ALTER TABLE sensors
    DROP CONSTRAINT IF EXISTS sensors_code_key;

ALTER TABLE sensors
    RENAME TO measurement_variables;

ALTER TABLE measurement_variables
    RENAME CONSTRAINT fk_sensor_station TO fk_measurement_variable_station;

ALTER TABLE measurement_variables
    RENAME COLUMN name TO display_name;

ALTER TABLE measurement_variables
    ADD COLUMN description TEXT,
    ADD COLUMN data_type VARCHAR(30) NOT NULL DEFAULT 'NUMERIC',
    ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN first_seen_at TIMESTAMPTZ,
    ADD COLUMN last_seen_at TIMESTAMPTZ;

UPDATE measurement_variables
SET active = CASE status
    WHEN 'ACTIVE' THEN TRUE
    ELSE FALSE
END;

ALTER TABLE measurement_variables
    DROP COLUMN sensor_type,
    DROP COLUMN depth_cm,
    DROP COLUMN status,
    DROP COLUMN metadata;

ALTER TABLE measurement_variables
    ADD CONSTRAINT uk_measurement_variable_station_code UNIQUE (station_id, code);

ALTER TABLE measurements
    RENAME COLUMN time TO measured_at;

ALTER TABLE measurements
    RENAME COLUMN sensor_id TO variable_id;

ALTER TABLE measurements
    RENAME COLUMN value TO numeric_value;

ALTER TABLE measurements
    ADD COLUMN text_value TEXT;

UPDATE measurement_variables variable
SET first_seen_at = measurement_bounds.first_seen_at,
    last_seen_at = measurement_bounds.last_seen_at
FROM (
    SELECT variable_id, MIN(measured_at) AS first_seen_at, MAX(measured_at) AS last_seen_at
    FROM measurements
    GROUP BY variable_id
) measurement_bounds
WHERE variable.id = measurement_bounds.variable_id;

ALTER TABLE measurements
    ADD CONSTRAINT fk_measurement_variable
        FOREIGN KEY (variable_id)
        REFERENCES measurement_variables(id)
        ON DELETE CASCADE;

ALTER TABLE alerts
    RENAME COLUMN sensor_id TO variable_id;

ALTER TABLE alerts
    ADD CONSTRAINT fk_alert_measurement_variable
        FOREIGN KEY (variable_id)
        REFERENCES measurement_variables(id)
        ON DELETE CASCADE;

CREATE INDEX idx_measurement_variable_station
ON measurement_variables(station_id);

CREATE INDEX idx_measurement_variable_measured_at
ON measurements(variable_id, measured_at DESC);

CREATE INDEX idx_alert_variable_status
ON alerts(variable_id, status);
