# NEXUS Platform Documentation

NEXUS Platform is an agro-meteorological monitoring system built as a Maven monorepo. It consumes processed `.dat` files produced by existing acquisition software, imports measurements into PostgreSQL with TimescaleDB, exposes secured Spring Boot REST APIs, and presents operational monitoring screens in a React frontend.

```text
Weather stations
    -> Existing processing software
    -> Processed .dat files
    -> nexus-importer
    -> PostgreSQL + TimescaleDB
    -> nexus-api
    -> React frontend
    -> User
```

## Documentation Index

- [Project Overview](PROJECT_OVERVIEW.md)
- [Architecture](ARCHITECTURE.md)
- [Backend](BACKEND.md)
- [Importer](IMPORTER.md)
- [Frontend](FRONTEND.md)
- [Database](DATABASE.md)
- [API](API.md)
- [Deployment](DEPLOYMENT.md)
- [Security](SECURITY.md)
- [Folder Structure](FOLDER_STRUCTURE.md)
- [Database Schema](DATABASE_SCHEMA.md)
- [Mermaid ERD](DATABASE_SCHEMA.mmd)
- [DBML Schema](DATABASE_SCHEMA.dbml)
- [SVG ERD](DATABASE_SCHEMA.svg)

## Technologies

- Java 21
- Spring Boot 3.5.x
- Spring Web, Spring Data JPA, Spring Security
- Spring OAuth2 Resource Server JWT support
- PostgreSQL and TimescaleDB
- Flyway
- Redis dependency in the API module
- React 19, TypeScript, Vite
- Tailwind CSS
- Axios
- Docker Compose for PostgreSQL and Redis infrastructure

## Modules

| Module | Responsibility |
| --- | --- |
| `nexus-domain` | Shared JPA entities, enums, and value objects. |
| `nexus-api` | REST API, authentication, authorization, DTO mapping, CRUD and monitoring endpoints. |
| `nexus-importer` | Scheduled `.dat` discovery, parsing, station/variable resolution, checkpointing, import logs, and measurement upsert. |
| `frontend` | React application with authenticated routes, dashboard pages, CRUD/monitoring screens, and API integration. |
| `database` | Flyway SQL migrations. |
| `docker` | Local PostgreSQL/TimescaleDB and Redis Compose configuration. |

## Running Locally

1. Configure environment values in `docker/.env`.
2. Start infrastructure:

```bash
docker compose -f docker/docker-compose.yml up -d
```

3. Run the API:

```bash
mvn -pl nexus-api -am spring-boot:run
```

4. Run the importer with an input directory:

```bash
NEXUS_IMPORTER_INPUT_DIRECTOR=/path/to/dat-files mvn -pl nexus-importer -am spring-boot:run
```

5. Run the frontend:

```bash
cd frontend
npm install
npm run dev
```

## Screenshots

Placeholders:

- Dashboard screenshot
- Measurements analytics screenshot
- Importer monitoring screenshot
- User administration screenshot

## Authors

NEXUS Platform engineering team.
