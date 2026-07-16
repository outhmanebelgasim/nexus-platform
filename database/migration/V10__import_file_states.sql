CREATE TABLE import_file_states (
    id BIGSERIAL PRIMARY KEY,
    file_key VARCHAR(500) NOT NULL UNIQUE,
    file_name VARCHAR(255) NOT NULL,
    last_modified_at TIMESTAMPTZ NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    header_signature VARCHAR(255) NOT NULL,
    last_processed_physical_line BIGINT,
    last_processed_timestamp TIMESTAMPTZ,
    last_successful_batch_id UUID,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_import_file_states_file_name
ON import_file_states(file_name);
