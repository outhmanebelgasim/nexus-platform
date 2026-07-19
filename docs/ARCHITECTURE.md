# Architecture

## Monorepo Architecture

The repository is a Maven monorepo for backend Java modules plus a separate React frontend folder.

```text
nexus-platform
|-- nexus-domain
|-- nexus-api
|-- nexus-importer
|-- frontend
|-- database
`-- docker
```

The root Maven `pom.xml` aggregates:

- `nexus-domain`
- `nexus-api`
- `nexus-importer`

The frontend is managed separately with npm/Vite.

## Module Dependencies

```text
            +----------------+
            | nexus-domain   |
            +----------------+
               ^          ^
               |          |
      +--------+          +-----------+
      |                               |
+-------------+              +----------------+
| nexus-api   |              | nexus-importer |
+-------------+              +----------------+
      |
      v
+-------------+
| frontend    |
+-------------+
```

- `nexus-domain` has only persistence model types and enums.
- `nexus-api` depends on `nexus-domain`.
- `nexus-importer` depends on `nexus-domain`.
- `frontend` depends on HTTP APIs exposed by `nexus-api`.
- `database/migration` is copied into both API and importer runtime classpaths.

## Backend Architecture

The API follows a layered Spring Boot structure:

```text
Controller
    -> Service interface
    -> Service implementation
    -> Repository
    -> PostgreSQL
```

Controllers use DTOs and validation annotations. Services contain business logic and access checks. Repositories are Spring Data JPA interfaces. `GlobalExceptionHandler` maps domain and validation errors into API error responses.

## Importer Architecture

The importer is an independent Spring Boot application with scheduling enabled. It does not expose REST controllers.

```text
ImporterScheduler
    -> DatFileScanner
    -> StationDiscoveryService
    -> ImportFileStateService
    -> DatFileParser
    -> ImportRecoveryDecisionService
    -> DatFileImportService
        -> MeasurementVariableResolutionService
        -> MeasurementPersistenceService
            -> MeasurementBatchUpsertDao
        -> ImportFileStateService
    -> ImportLogService
```

Each file import uses a generated batch UUID. Successful file imports update checkpoints and write import logs. Failures are logged through a `REQUIRES_NEW` transaction so a failed import can still be recorded.

## Frontend Architecture

The React application is organized by pages, reusable components, hooks, services, types, and shared libraries.

```text
App routes
    -> ProtectedRoute
    -> DashboardLayout
    -> Page
    -> Hook
    -> Service
    -> Axios apiClient
    -> nexus-api
```

Authentication state is stored in `AuthProvider`. Axios attaches bearer tokens except for public login/register endpoints. Route access is centralized in `navigationAccess`.

## Database Architecture

PostgreSQL stores relational data and TimescaleDB handles measurements as a hypertable. Flyway migrations create and evolve the schema. The current measurement design uses `measurement_variables` instead of the original `sensors` table name.

Main relationships:

- Farm has many Stations.
- Station has many MeasurementVariables.
- MeasurementVariable has many Measurements and Alerts.
- User has many-to-many scoped access to Farms, Stations, and MeasurementVariables.
- User has an element collection of allowed MeasurementTypes.
- ImportFileState tracks importer checkpoints.
- ImportLog tracks each file execution.

## Deployment Architecture

The checked-in Docker Compose file starts PostgreSQL/TimescaleDB and Redis only. API, importer, and frontend are currently run from project commands rather than Docker service definitions in the Compose file.

```text
docker-compose
|-- postgres: timescale/timescaledb:latest-pg16
`-- redis: redis:7-alpine

local processes
|-- nexus-api
|-- nexus-importer
`-- frontend dev server
```
