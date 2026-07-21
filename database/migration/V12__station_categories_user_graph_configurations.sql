ALTER TABLE stations
    ADD COLUMN IF NOT EXISTS station_category VARCHAR(30);

UPDATE stations
SET station_category = CASE
    WHEN lower(code) LIKE 'mto\_%' ESCAPE '\' THEN 'METEO'
    WHEN lower(code) LIKE 'fos\_%' ESCAPE '\' THEN 'FOS'
    ELSE station_category
END
WHERE station_category IS NULL;

CREATE INDEX IF NOT EXISTS idx_stations_station_category
ON stations(station_category);

CREATE TABLE IF NOT EXISTS user_graph_configurations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    station_category VARCHAR(30) NOT NULL,
    y_axis_min NUMERIC(14, 4) NOT NULL,
    y_axis_max NUMERIC(14, 4) NOT NULL,
    display_order INTEGER NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    created_by_id BIGINT,
    CONSTRAINT fk_user_graph_configurations_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_user_graph_configurations_created_by
        FOREIGN KEY (created_by_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT chk_user_graph_configurations_category
        CHECK (station_category IN ('METEO', 'FOS')),
    CONSTRAINT chk_user_graph_configurations_axis
        CHECK (y_axis_max > y_axis_min),
    CONSTRAINT uk_user_graph_configurations_user_order
        UNIQUE (user_id, display_order)
);

CREATE TABLE IF NOT EXISTS user_graph_variables (
    id BIGSERIAL PRIMARY KEY,
    graph_configuration_id BIGINT NOT NULL,
    variable_code VARCHAR(150) NOT NULL,
    display_order INTEGER NOT NULL,
    CONSTRAINT fk_user_graph_variables_graph
        FOREIGN KEY (graph_configuration_id)
        REFERENCES user_graph_configurations(id)
        ON DELETE CASCADE,
    CONSTRAINT uk_user_graph_variable_code
        UNIQUE (graph_configuration_id, variable_code)
);

CREATE INDEX IF NOT EXISTS idx_user_graph_configurations_user_category_active
ON user_graph_configurations(user_id, station_category, active);

CREATE INDEX IF NOT EXISTS idx_user_graph_configurations_created_by
ON user_graph_configurations(created_by_id);

CREATE INDEX IF NOT EXISTS idx_user_graph_variables_graph
ON user_graph_variables(graph_configuration_id);

CREATE INDEX IF NOT EXISTS idx_user_graph_variables_code
ON user_graph_variables(variable_code);
