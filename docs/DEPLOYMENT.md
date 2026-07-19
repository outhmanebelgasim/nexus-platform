# Deployment

## Local Infrastructure

The checked-in `docker/docker-compose.yml` defines:

- `postgres`: `timescale/timescaledb:latest-pg16`
- `redis`: `redis:7-alpine`

It also defines a persistent PostgreSQL volume: `nexus_postgres_data`.

## Docker Compose

```bash
docker compose -f docker/docker-compose.yml up -d
```

The Compose file reads variables from `docker/.env`. Do not commit real secret values.

## Environment Variables

Confirmed variables used by the API and importer:

| Variable | Used by | Meaning |
| --- | --- | --- |
| `DB_URL` | API, importer | JDBC PostgreSQL URL. |
| `DB_USERNAME` | API, importer | Database username. |
| `DB_PASSWORD` | API, importer | Database password. |
| `POSTGRES_USER` | Docker, fallback app config | PostgreSQL username. |
| `POSTGRES_PASSWORD` | Docker, fallback app config | PostgreSQL password. |
| `POSTGRES_PORT` | Docker | Host PostgreSQL port. |
| `REDIS_PORT` | Docker | Host Redis port. |
| `JWT_SECRET` | API | HS256 JWT signing secret. |
| `JWT_ISSUER` | API | JWT issuer. |
| `JWT_EXPIRATION_MINUTES` | API | JWT lifetime in minutes. |
| `NEXUS_IMPORTER_INPUT_DIRECTOR` | importer | `.dat` input directory. |
| `NEXUS_IMPORTER_ENABLED` | importer | Enables scheduled scanner. |
| `NEXUS_IMPORTER_SCAN_DELAY` | importer | Delay between scans. |
| `NEXUS_IMPORTER_INITIAL_DELAY` | importer | Initial scanner delay. |
| `NEXUS_IMPORTER_MINIMUM_FILE_AGE` | importer | Minimum file age before import. |
| `NEXUS_IMPORTER_SOURCE_TIME_ZONE` | importer | Source timestamp time zone. |
| `NEXUS_IMPORTER_MEASUREMENT_BATCH_SIZE` | importer | Measurement upsert batch size. |
| `VITE_API_BASE_URL` | frontend | API base URL for Axios. |

## API Startup

```bash
mvn -pl nexus-api -am spring-boot:run
```

Startup chain:

```text
Load properties
    -> connect PostgreSQL
    -> run Flyway migrations
    -> validate Hibernate schema
    -> start REST API
```

## Importer Startup

```bash
NEXUS_IMPORTER_INPUT_DIRECTOR=/path/to/dat-files mvn -pl nexus-importer -am spring-boot:run
```

Startup chain:

```text
Load properties
    -> connect PostgreSQL
    -> run Flyway migrations
    -> validate Hibernate schema
    -> start scheduler
    -> scan .dat directory
```

## Frontend Startup

```bash
cd frontend
npm install
npm run dev
```

For production build:

```bash
cd frontend
npm run build
```

## Startup Order

Recommended local order:

1. PostgreSQL/TimescaleDB.
2. Redis.
3. `nexus-api` so the frontend can authenticate and query data.
4. `nexus-importer` when the database is ready and the input directory exists.
5. Frontend dev server or built frontend artifact.

## Current Docker Gap

The current Compose file does not define `nexus-api`, `nexus-importer`, or `frontend` services, and no module Dockerfiles were found during inspection. Containerized application deployment should be added explicitly before claiming full Dockerized production deployment.
