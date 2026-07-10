CREATE TABLE IF NOT EXISTS user_farm_access (
    user_id BIGINT NOT NULL,
    farm_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, farm_id),
    CONSTRAINT fk_user_farm_access_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_user_farm_access_farm
        FOREIGN KEY (farm_id)
        REFERENCES farms(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_station_access (
    user_id BIGINT NOT NULL,
    station_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, station_id),
    CONSTRAINT fk_user_station_access_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_user_station_access_station
        FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_measurement_type_access (
    user_id BIGINT NOT NULL,
    measurement_type VARCHAR(80) NOT NULL,
    PRIMARY KEY (user_id, measurement_type),
    CONSTRAINT fk_user_measurement_type_access_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_user_measurement_type_access_type
        CHECK (measurement_type IN (
            'AIR_TEMPERATURE',
            'SOIL_TEMPERATURE',
            'RELATIVE_HUMIDITY',
            'SOIL_MOISTURE',
            'WIND_SPEED',
            'WIND_DIRECTION',
            'SOLAR_RADIATION',
            'RAINFALL',
            'ET',
            'PRESSURE',
            'BATTERY_VOLTAGE',
            'INTERNAL_TECHNICAL_DATA'
        ))
);

CREATE INDEX IF NOT EXISTS idx_user_farm_access_farm
ON user_farm_access(farm_id);

CREATE INDEX IF NOT EXISTS idx_user_station_access_station
ON user_station_access(station_id);
