# Project Overview

## Purpose

NEXUS Platform is an agro-meteorological monitoring platform. It starts after the existing acquisition and processing system has already generated processed `.dat` files. The platform imports those files, stores time-series measurements, exposes secured APIs, and gives users an operational web interface for farms, stations, variables, measurements, alerts, importer activity, and user access management.

## Business Problem

Agricultural operations need reliable visibility into weather-station and soil-sensor measurements. The existing acquisition chain already produces processed files, but the repository provides the missing application layer: structured storage, access-controlled APIs, historical analytics, operational monitoring, and a maintainable frontend.

## End-to-End Workflow

```text
Weather Stations
        |
        v
Existing processing software
        |
        v
Processed .dat files
        |
        v
nexus-importer
        |
        v
PostgreSQL + TimescaleDB
        |
        v
nexus-api
        |
        v
React frontend
```

## Technologies

- Maven monorepo with Java 21.
- Spring Boot 3.5.x for API and importer applications.
- Spring Data JPA for entity persistence.
- JDBC batch upsert for high-volume measurement imports.
- Flyway for schema migration.
- PostgreSQL with TimescaleDB hypertable support for measurements.
- Spring Security with stateless JWT.
- React 19, TypeScript, Vite, Tailwind CSS, Axios, and React Router.
- Docker Compose for PostgreSQL/TimescaleDB and Redis infrastructure.

## Module Responsibilities

| Module | Responsibility |
| --- | --- |
| `nexus-domain` | Shared domain model: entities and enums only. |
| `nexus-api` | HTTP API, authentication, authorization, DTOs, services, repositories, monitoring endpoints. |
| `nexus-importer` | `.dat` scanning, parsing, checkpointing, station discovery, variable synchronization, measurement import, import logs. |
| `frontend` | Browser application, authenticated routing, data screens, operational monitoring UI. |
| `database` | Flyway migrations shared by API and importer runtime classpaths. |
| `docker` | Local infrastructure services. |

## Important Features

- JWT login, registration, logout endpoint, and current-user profile endpoints.
- Role-based access for `SUPER_ADMIN`, `ADMIN`, `TECHNICIAN`, and `VIEWER`.
- Farm, station, measurement-variable, measurement, alert, import-log, and user APIs.
- User-specific farm, station, measurement-variable, and measurement-type access scopes.
- Scheduled importer with duplicate avoidance through `import_file_states`.
- Parser for multi-row `.dat` headers and timestamped data rows.
- Batch measurement upsert using PostgreSQL `ON CONFLICT`.
- Read-only importer monitoring endpoints for administrators.
- React route protection and API-token interceptor.
- Custom SVG-based measurement charts implemented in React components.
