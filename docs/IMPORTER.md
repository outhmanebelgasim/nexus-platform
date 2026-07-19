# Importer

## Module

`nexus-importer` is an independent Spring Boot application. Its main class is `com.nexus.importer.NexusImporterApplication`, which enables scheduling and configuration-property scanning.

The importer does not expose REST endpoints and does not communicate with the frontend.

## Package Responsibilities

| Package | Responsibility |
| --- | --- |
| `config` | Importer configuration properties. |
| `file` | `.dat` descriptor, metadata parsing, scanning, and file type classification. |
| `parser` | CSV parsing, header validation, data-row parsing, parse issues. |
| `scheduling` | Scheduled scan orchestration, recovery decisions, per-file import service. |
| `station` | Station discovery and resolution. |
| `variable` | Measurement-variable synchronization. |
| `measurement` | Measurement import candidates, batching, existing-value detection, JDBC upsert. |
| `state` | Persistent checkpoint and import-file state management. |
| `logging` | Import-log persistence. |
| `repository` | Importer-specific Spring Data repositories. |

## Configuration

Properties are bound from `nexus.importer.*`:

| Property | Meaning |
| --- | --- |
| `input-directory` | Directory scanned for supported `.dat` files. |
| `enabled` | Enables scheduled scanning when `true`. |
| `scan-delay` | Fixed delay between scans. |
| `initial-delay` | Initial startup delay before the first scan. |
| `minimum-file-age` | Prevents importing files that may still be changing. |
| `source-time-zone` | Time zone used to convert local `.dat` timestamps. |
| `measurement-batch-size` | JDBC batch size for measurement upserts. |

The current `application.properties` maps the input directory from `NEXUS_IMPORTER_INPUT_DIRECTOR`.

## Scheduler

`ImporterScheduler` is enabled by `@ConditionalOnProperty(prefix = "nexus.importer", name = "enabled", havingValue = "true")`. It uses `@Scheduled` with `scan-delay` and `initial-delay`.

An `AtomicBoolean` prevents overlapping scans. One failing file does not stop the whole directory scan; failures are caught per file and logged.

## Execution Flow

```text
scanForDatFiles()
    |
    v
DatFileScanner.scan()
    |
    v
for each file
    |
    +--> StationDiscoveryService.resolve()
    +--> ImportFileStateService.prepare()
    +--> DatFileParser.parse()
    +--> ImportRecoveryDecisionService.decide()
    +--> ImportFileStateService.applyCheckpoint()
    +--> DatFileImportService.importFile()
            |
            +--> MeasurementVariableResolutionService.resolve()
            +--> MeasurementPersistenceService.persist()
                    |
                    +--> MeasurementBatchUpsertDao.findExistingValues()
                    +--> MeasurementBatchUpsertDao.upsert()
            +--> ImportFileStateService.markSuccessful()
    +--> ImportLogService.recordCompleted()
```

## Parser

`DatFileParser` uses Apache Commons CSV with RFC 4180 parsing.

Expected file structure:

```text
line 1: logger metadata
line 2: variable codes
line 3: units
line 4: aggregation metadata
line 5+: timestamped measurement rows
```

Validation rules found in code:

- Header rows must have equal column counts.
- First variable-code header column must be `TIMESTAMP`.
- Variable codes cannot be blank.
- Duplicate variable codes inside one file are rejected.
- Data rows with mismatched column counts are skipped.
- Timestamps use `yyyy-MM-dd HH:mm:ss`.
- Invalid numeric tokens such as `nan`, `inf`, and `infinity` are treated as invalid.

## Checkpoint

`import_file_states` stores persistent file checkpoints:

- file identity and name
- last modified timestamp
- file size
- header signature
- last processed physical line
- last processed timestamp
- last successful batch id
- update timestamp

The importer prepares state before parsing, decides whether import is required, applies checkpoints, and marks success only after the file import completes.

## Import Log

`ImportLogService` records completed, failed, and skipped file executions. It uses `REQUIRES_NEW` transactions so log records can be persisted independently from the main file import transaction.

Each normal import has a generated batch UUID shared with measurements through `import_batch_id`.

## Station Resolution

`StationDiscoveryService` resolves the station associated with each `.dat` descriptor. The station entity includes importer metadata:

- `discoveredByImporter`
- `sourceFilename`
- `lastSeenAt`

The database also includes `farms.system_key`, used by importer-created unassigned-station grouping.

## Variable Resolution

`MeasurementVariableResolutionService` maps parsed headers to `measurement_variables` for a station. The unique database identity is `(station_id, code)`.

The entity preserves administrative metadata:

- `displayName`
- `description`
- `measurementType`
- `active`

## Measurement Import

`MeasurementPersistenceService` builds measurement candidates from parsed rows and resolved variables. `MeasurementBatchUpsertDao` writes using JDBC batch operations and PostgreSQL `ON CONFLICT (measured_at, variable_id) DO UPDATE`.

The measurement primary key is composite:

```text
(measured_at, variable_id)
```

## Batching

Batch size is controlled by `nexus.importer.measurement-batch-size`. The persistence service divides candidates into batches, checks existing values, then upserts each batch.

## Failure Handling

- Discovery-level failures are logged and end the current scan.
- File-level failures are caught, logged, and do not stop later files.
- Skipped files can be recorded as partial-success import-log entries.
- Checkpoints advance only through the successful import path.
