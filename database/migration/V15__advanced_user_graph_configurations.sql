ALTER TABLE user_graph_configurations
    ADD COLUMN primary_axis_label VARCHAR(120),
    ADD COLUMN primary_axis_unit VARCHAR(40),
    ADD COLUMN secondary_axis_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN secondary_axis_label VARCHAR(120),
    ADD COLUMN secondary_axis_unit VARCHAR(40),
    ADD COLUMN secondary_axis_min NUMERIC(14, 4),
    ADD COLUMN secondary_axis_max NUMERIC(14, 4);

ALTER TABLE user_graph_variables
    ADD COLUMN axis VARCHAR(20) NOT NULL DEFAULT 'PRIMARY',
    ADD COLUMN chart_type VARCHAR(20) NOT NULL DEFAULT 'LINE',
    ADD COLUMN custom_label VARCHAR(150);
