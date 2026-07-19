# Backend

## Module

`nexus-api` is the Spring Boot REST API application. Its main class is `com.nexus.platform.NexusPlatformApplication`.

## Package Responsibilities

| Package | Responsibility |
| --- | --- |
| `controller` | REST endpoints and request/response handling. |
| `dto` | Request and response DTO records. |
| `exception` | API error response model and global exception handling. |
| `mapper` | Entity-to-DTO and DTO-to-entity mapping helpers. |
| `model` | API-only read model for importer file state monitoring. |
| `repository` | Spring Data JPA repositories. |
| `security` | JWT, Spring Security, user details, password encoder, CORS. |
| `service` | Service contracts and access-control service. |
| `service.impl` | Business logic implementations. |

## Controllers

- `AuthController`: login, register, logout, current authenticated user.
- `UserController`: user administration, self profile, password update, permissions.
- `FarmController`: farm CRUD and scoped read access.
- `StationController`: station CRUD and farm-scoped lookup.
- `MeasurementVariableController`: measurement-variable listing and metadata update. Also supports legacy `/api/sensors` path.
- `MeasurementController`: measurement listing, lookup, create, update, delete.
- `AlertController`: alert listing, lookup, create, update, delete.
- `ImportLogController`: import-log CRUD and batch lookup.
- `ImporterMonitoringController`: read-only importer status, logs, and checkpointed files.

## Services

Service interfaces sit in `com.nexus.platform.service`, with implementations in `service.impl`. Write operations are annotated with `@Transactional`; read services commonly use `@Transactional(readOnly = true)`.

Notable services:

- `AuthServiceImpl`: authenticates users, generates JWTs, registers users, returns current user.
- `AccessControlService`: enforces role and data-scope rules for farms, stations, variables, and measurement types.
- `UserServiceImpl`: user creation, updates, status changes, password update, deletion, and permissions.
- `MeasurementServiceImpl`: query and mutate measurement records with access checks.
- `ImporterMonitoringServiceImpl`: aggregates importer state using import logs and file-state views.

## Repositories

Repositories are Spring Data JPA interfaces over domain entities:

- `FarmRepository`
- `StationRepository`
- `MeasurementVariableRepository`
- `MeasurementRepository`
- `AlertRepository`
- `ImportLogRepository`
- `UserRepository`
- `ImportFileStateViewRepository`

## Entities

Entities are owned by `nexus-domain`, not `nexus-api`:

- `Farm`
- `Station`
- `MeasurementVariable`
- `Measurement`
- `MeasurementId`
- `Alert`
- `ImportLog`
- `AppUser`

`nexus-api` contains `ImportFileStateView`, a read-only JPA mapping for `import_file_states` used by importer monitoring.

## Security

Security is configured in `SecurityConfig`.

- Stateless sessions.
- CSRF disabled because the API is bearer-token based.
- OAuth2 resource server JWT decoder and encoder use HS256.
- Passwords are encoded with BCrypt.
- CORS allows local Vite development origins on ports `5173` and `5174`.
- Public endpoints: `POST /api/auth/login`, `POST /api/auth/register`.
- Authenticated profile endpoints: `/api/auth/logout`, `/api/auth/me`, `/api/users/me`, `/api/users/me/password`, `/api/users/me/permissions`.
- Administrative user endpoints require `SUPER_ADMIN` or `ADMIN`.

## JWT

`JwtService` generates JWTs with:

- issuer from `nexus.security.jwt.issuer`
- subject as user email
- `userId` claim
- `role` claim
- expiration from `nexus.security.jwt.expiration-minutes`
- HS256 signing

The JWT authentication converter reads the `role` claim and maps it to `ROLE_*` authorities.

## Authorization

Global authorization is enforced in `SecurityConfig`; resource-level authorization is enforced inside service logic through `AccessControlService`.

Role groups:

- `SUPER_ADMIN`, `ADMIN`: administration.
- `TECHNICIAN`, `VIEWER`: read-oriented operational access.

Scoped access tables:

- `user_farm_access`
- `user_station_access`
- `user_measurement_variable_access`
- `user_measurement_type_access`

## Redis Usage

`nexus-api` declares `spring-boot-starter-data-redis`, and Docker Compose provides Redis. Current inspected code does not define Redis repositories, cache managers, or cache annotations, so Redis is infrastructure-ready but no concrete cache behavior was found in the application code.

## Flyway

Flyway is enabled in `application.properties` and loads migrations from `classpath:db/migration`. The API POM copies SQL files from `../database/migration` into that classpath. Hibernate uses `ddl-auto=validate`, so Flyway is the schema owner.

## Dependency Injection

The API uses constructor injection in controllers, services, and security configuration. No controller business logic was found beyond request routing and parameter selection.

## Transaction Management

Service implementations use Spring `@Transactional`. Read-heavy services default to read-only transactions, and modifying methods override with write transactions.
