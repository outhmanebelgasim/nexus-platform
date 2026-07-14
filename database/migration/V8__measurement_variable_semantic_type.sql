ALTER TABLE measurement_variables
    ADD COLUMN measurement_type VARCHAR(80);

ALTER TABLE measurement_variables
    ADD CONSTRAINT chk_measurement_variables_measurement_type
        CHECK (
            measurement_type IS NULL OR measurement_type IN (
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
            )
        );

CREATE INDEX idx_measurement_variable_measurement_type
ON measurement_variables(measurement_type);
