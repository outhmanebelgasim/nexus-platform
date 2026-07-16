CREATE TABLE IF NOT EXISTS user_measurement_variable_access (
    user_id BIGINT NOT NULL,
    variable_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, variable_id),
    CONSTRAINT fk_user_measurement_variable_access_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_user_measurement_variable_access_variable
        FOREIGN KEY (variable_id)
        REFERENCES measurement_variables(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_measurement_variable_access_variable
ON user_measurement_variable_access(variable_id);
