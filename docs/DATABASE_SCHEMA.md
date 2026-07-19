# Database Schema

## Entity Relationship Summary

```text
farms 1--* stations
stations 1--* measurement_variables
measurement_variables 1--* measurements
measurement_variables 1--* alerts
users *--* farms
users *--* stations
users *--* measurement_variables
users 1--* user_measurement_type_access
import_logs independent, linked to measurements by import_batch_id value
import_file_states independent importer checkpoint table
```

## Key Design Points

- Measurements use a composite primary key: `(measured_at, variable_id)`.
- Measurements are converted to a TimescaleDB hypertable by Flyway.
- Measurement variables are uniquely identified by `(station_id, code)`.
- User access is represented by join tables rather than embedding permissions in JWTs.
- Importer checkpoints are persisted in `import_file_states`.
- Import logs use a unique `batch_id`; measurements store the same UUID as `import_batch_id`.

## Cascades

Database-level cascade rules from migrations:

- Deleting a farm deletes its stations.
- Deleting a station deletes its measurement variables.
- Deleting a measurement variable deletes related measurements and alerts.
- Deleting a user removes access-scope rows.
- Deleting a farm/station/variable removes related access-scope rows.

## Composite Keys

- `measurements`: `(measured_at, variable_id)`.
- `user_farm_access`: `(user_id, farm_id)`.
- `user_station_access`: `(user_id, station_id)`.
- `user_measurement_type_access`: `(user_id, measurement_type)`.
- `user_measurement_variable_access`: `(user_id, variable_id)`.

## Indexes

- `idx_station_farm`
- `idx_measurement_variable_station`
- `idx_measurement_variable_measured_at`
- `idx_alert_variable_status`
- `idx_import_file_states_file_name`
- `idx_users_email`
- `idx_user_farm_access_farm`
- `idx_user_station_access_station`
- `idx_user_measurement_variable_access_variable`
