# Database

## Overview

The database is PostgreSQL with TimescaleDB. Flyway owns schema evolution, and Hibernate validates the schema at runtime.

Migrations are stored in `database/migration` and copied into the API and importer classpaths as `db/migration`.

## Tables

### farms

Purpose: groups stations by farm or operational site.

Columns:

| Column | Type | Constraints | Meaning |
| --- | --- | --- | --- |
| `id` | `BIGSERIAL` | primary key | Farm identifier. |
| `name` | `VARCHAR(150)` | not null | Farm name. |
| `location` | `VARCHAR(255)` | nullable | Human location text. |
| `description` | `TEXT` | nullable | Farm description. |
| `google_maps_url` | `TEXT` | nullable | External map link. |
| `system_key` | `VARCHAR(100)` | unique, nullable | Stable system key, used for importer-created grouping. |
| `created_at` | `TIMESTAMPTZ` | not null | Creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | nullable | Last update timestamp. |

Relationships: one farm has many stations; many users can be scoped to many farms.

### stations

Purpose: represents a weather station or imported station source.

Columns: `id`, `farm_id`, `name`, `code`, `latitude`, `longitude`, `altitude`, `status`, `created_at`, `updated_at`, `discovered_by_importer`, `source_filename`, `last_seen_at`.

Constraints and indexes:

- Primary key: `id`.
- Foreign key: `farm_id -> farms(id)` with cascade delete.
- Unique: `code`.
- Index: `idx_station_farm(farm_id)`.

Relationships: station belongs to one farm and has many measurement variables.

### measurement_variables

Purpose: represents a measurable variable imported from a station file. This table replaced the initial `sensors` table.

Columns: `id`, `station_id`, `code`, `display_name`, `unit`, `created_at`, `updated_at`, `description`, `data_type`, `active`, `first_seen_at`, `last_seen_at`, `measurement_type`.

Constraints and indexes:

- Primary key: `id`.
- Foreign key: `station_id -> stations(id)` with cascade delete.
- Unique: `(station_id, code)`.
- Index: `idx_measurement_variable_station(station_id)`.

Relationships: variable belongs to one station and has many measurements and alerts. Users can be granted direct access to variables.

### measurements

Purpose: time-series measurement storage.

Columns:

| Column | Type | Constraints | Meaning |
| --- | --- | --- | --- |
| `measured_at` | `TIMESTAMPTZ` | primary key part | Measurement timestamp. |
| `variable_id` | `BIGINT` | primary key part, FK | Measurement variable. |
| `numeric_value` | `DOUBLE PRECISION` | nullable | Numeric reading. |
| `text_value` | `TEXT` | nullable | Text reading. |
| `quality` | `VARCHAR(30)` | not null | Measurement quality enum. |
| `import_batch_id` | `UUID` | nullable | Import batch that wrote the row. |
| `created_at` | `TIMESTAMPTZ` | not null | Insert timestamp. |

Constraints and indexes:

- Primary key: `(measured_at, variable_id)`.
- Foreign key: `variable_id -> measurement_variables(id)` with cascade delete.
- TimescaleDB hypertable on `measured_at`.
- Index: `idx_measurement_variable_measured_at(variable_id, measured_at DESC)`.

### alerts

Purpose: stores alerts triggered against measurement variables.

Columns: `id`, `variable_id`, `alert_type`, `severity`, `message`, `status`, `triggered_at`, `resolved_at`.

Constraints and indexes:

- Primary key: `id`.
- Foreign key: `variable_id -> measurement_variables(id)` with cascade delete.
- Index: `idx_alert_variable_status(variable_id, status)`.

### import_logs

Purpose: records importer executions.

Columns: `id`, `batch_id`, `file_name`, `file_path`, `status`, `total_rows`, `imported_rows`, `skipped_rows`, `error_message`, `started_at`, `finished_at`.

Constraints:

- Primary key: `id`.
- Unique: `batch_id`.

### import_file_states

Purpose: persistent importer checkpoint state and duplicate avoidance.

Columns: `id`, `file_key`, `file_name`, `last_modified_at`, `file_size_bytes`, `header_signature`, `last_processed_physical_line`, `last_processed_timestamp`, `last_successful_batch_id`, `updated_at`.

Constraints and indexes:

- Primary key: `id`.
- Unique: `file_key`.
- Index: `idx_import_file_states_file_name(file_name)`.

### users

Purpose: application account and role storage.

Columns: `id`, `full_name`, `email`, `password_hash`, `role`, `created_at`, `updated_at`, `status`, `created_by_id`.

Constraints and indexes:

- Primary key: `id`.
- Unique: `email`.
- Role/status check constraints were introduced in migrations, then role checks were expanded for `SUPER_ADMIN`.
- Index: `idx_users_email(email)`.

### user_farm_access

Purpose: many-to-many farm access scope for users.

Columns: `user_id`, `farm_id`.

Constraints:

- Primary key: `(user_id, farm_id)`.
- Foreign keys to `users(id)` and `farms(id)` with cascade delete.
- Index: `idx_user_farm_access_farm(farm_id)`.

### user_station_access

Purpose: many-to-many station access scope for users.

Columns: `user_id`, `station_id`.

Constraints:

- Primary key: `(user_id, station_id)`.
- Foreign keys to `users(id)` and `stations(id)` with cascade delete.
- Index: `idx_user_station_access_station(station_id)`.

### user_measurement_type_access

Purpose: user access by semantic measurement type.

Columns: `user_id`, `measurement_type`.

Constraints:

- Primary key: `(user_id, measurement_type)`.
- Foreign key to `users(id)` with cascade delete.
- Check constraint over known measurement type enum names from migrations.

### user_measurement_variable_access

Purpose: user access by explicit measurement variable.

Columns: `user_id`, `variable_id`.

Constraints:

- Primary key: `(user_id, variable_id)`.
- Foreign keys to `users(id)` and `measurement_variables(id)` with cascade delete.
- Index: `idx_user_measurement_variable_access_variable(variable_id)`.
