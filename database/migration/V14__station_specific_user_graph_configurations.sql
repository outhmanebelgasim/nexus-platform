ALTER TABLE user_graph_configurations
    ADD COLUMN IF NOT EXISTS station_id BIGINT;

ALTER TABLE user_graph_variables
    ADD COLUMN IF NOT EXISTS measurement_variable_id BIGINT;

WITH graph_station_candidates AS (
    SELECT
        graph.id AS graph_id,
        MIN(variable.station_id) AS station_id,
        COUNT(DISTINCT variable.station_id) AS station_count,
        COUNT(variable.id) AS matched_variable_count,
        COUNT(graph_variable.id) AS configured_variable_count
    FROM user_graph_configurations graph
    JOIN user_graph_variables graph_variable
        ON graph_variable.graph_configuration_id = graph.id
    JOIN measurement_variables variable
        ON variable.code = graph_variable.variable_code
    JOIN user_station_access station_access
        ON station_access.user_id = graph.user_id
       AND station_access.station_id = variable.station_id
    JOIN stations station
        ON station.id = variable.station_id
       AND station.station_category = graph.station_category
    WHERE graph.station_id IS NULL
    GROUP BY graph.id
)
UPDATE user_graph_configurations graph
SET station_id = candidate.station_id
FROM graph_station_candidates candidate
WHERE graph.id = candidate.graph_id
  AND candidate.station_count = 1
  AND candidate.matched_variable_count = candidate.configured_variable_count;

UPDATE user_graph_variables graph_variable
SET measurement_variable_id = variable.id
FROM user_graph_configurations graph
JOIN measurement_variables variable
    ON variable.station_id = graph.station_id
WHERE graph_variable.graph_configuration_id = graph.id
  AND graph.station_id IS NOT NULL
  AND graph_variable.measurement_variable_id IS NULL
  AND variable.code = graph_variable.variable_code;

UPDATE user_graph_configurations
SET active = false,
    updated_at = now()
WHERE station_id IS NULL;

UPDATE user_graph_configurations graph
SET active = false,
    updated_at = now()
WHERE graph.station_id IS NOT NULL
  AND EXISTS (
      SELECT 1
      FROM user_graph_variables graph_variable
      WHERE graph_variable.graph_configuration_id = graph.id
        AND graph_variable.measurement_variable_id IS NULL
  );

ALTER TABLE user_graph_configurations
    ADD CONSTRAINT fk_user_graph_configurations_station
        FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE CASCADE;

ALTER TABLE user_graph_variables
    ADD CONSTRAINT fk_user_graph_variables_measurement_variable
        FOREIGN KEY (measurement_variable_id)
        REFERENCES measurement_variables(id)
        ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_user_graph_configurations_user_station_active_order
ON user_graph_configurations(user_id, station_id, active, display_order);

CREATE INDEX IF NOT EXISTS idx_user_graph_configurations_station
ON user_graph_configurations(station_id);

CREATE INDEX IF NOT EXISTS idx_user_graph_variables_measurement_variable
ON user_graph_variables(measurement_variable_id);

DROP INDEX IF EXISTS idx_user_graph_configurations_user_category_active;

ALTER TABLE user_graph_configurations
    DROP CONSTRAINT IF EXISTS uk_user_graph_configurations_user_order;

CREATE UNIQUE INDEX IF NOT EXISTS uk_user_graph_configurations_user_station_order
ON user_graph_configurations(user_id, station_id, display_order)
WHERE station_id IS NOT NULL;
