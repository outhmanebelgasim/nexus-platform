# Folder Structure

```text
nexus-platform/
|-- pom.xml
|-- database/
|   `-- migration/
|-- docker/
|   `-- docker-compose.yml
|-- docs/
|-- frontend/
|   |-- package.json
|   |-- public/
|   `-- src/
|       |-- components/
|       |-- hooks/
|       |-- layouts/
|       |-- lib/
|       |-- pages/
|       |-- services/
|       |-- types/
|       `-- utils/
|-- nexus-api/
|   |-- pom.xml
|   `-- src/
|       |-- main/java/com/nexus/platform/
|       |   |-- controller/
|       |   |-- dto/
|       |   |-- exception/
|       |   |-- mapper/
|       |   |-- model/
|       |   |-- repository/
|       |   |-- security/
|       |   `-- service/
|       `-- main/resources/
|-- nexus-domain/
|   |-- pom.xml
|   `-- src/main/java/com/nexus/domain/
|       |-- entity/
|       `-- enums/
`-- nexus-importer/
    |-- pom.xml
    `-- src/main/java/com/nexus/importer/
        |-- config/
        |-- file/
        |-- logging/
        |-- measurement/
        |-- parser/
        |-- repository/
        |-- scheduling/
        |-- state/
        |-- station/
        `-- variable/
```

## Root

The root `pom.xml` is the Maven aggregator and Spring Boot parent holder. It defines Java 21 and includes `nexus-domain`, `nexus-api`, and `nexus-importer`.

## database

Contains Flyway migrations. The API and importer POMs copy these migrations into `classpath:db/migration`.

## docker

Contains local infrastructure configuration for PostgreSQL/TimescaleDB and Redis.

## docs

Contains project memory files and the generated technical documentation.

## nexus-domain

Shared module containing JPA entities and enums. It does not contain repositories, controllers, services, or Spring Boot application configuration.

## nexus-api

Spring Boot REST API module. It owns HTTP controllers, DTOs, security, services, repositories, mappers, and API exception handling.

## nexus-importer

Spring Boot scheduled importer module. It owns file scanning, parsing, station/variable resolution, measurement import, checkpoints, and importer logs.

## frontend

React application. The structure separates page screens, reusable components, custom hooks, API services, shared libraries, TypeScript types, and utility functions.
