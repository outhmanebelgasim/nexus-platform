ALTER TABLE farms
    ADD COLUMN system_key VARCHAR(100);

CREATE UNIQUE INDEX uk_farms_system_key
ON farms(system_key)
WHERE system_key IS NOT NULL;

ALTER TABLE stations
    ADD COLUMN discovered_by_importer BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN source_filename VARCHAR(255),
    ADD COLUMN last_seen_at TIMESTAMPTZ;

CREATE UNIQUE INDEX uk_stations_code_lower
ON stations (LOWER(code));
