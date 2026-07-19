# API Documentation

## Authentication

All protected endpoints use `Authorization: Bearer <jwt>`.

Public endpoints:

| Method | Endpoint | Request | Response |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | `LoginRequest` | `LoginResponse` |
| `POST` | `/api/auth/register` | `RegisterRequest` | `UserResponse` |

Authenticated endpoints:

| Method | Endpoint | Response |
| --- | --- | --- |
| `POST` | `/api/auth/logout` | `204 No Content` |
| `GET` | `/api/auth/me` | `UserResponse` |

## Users

Security: `/api/users/**` requires `SUPER_ADMIN` or `ADMIN`, except `/me`, `/me/password`, and `/me/permissions`, which require authentication.

| Method | Endpoint | Request | Response |
| --- | --- | --- | --- |
| `GET` | `/api/users` | none | `List<UserResponse>` |
| `GET` | `/api/users/me` | none | `UserResponse` |
| `GET` | `/api/users/me/permissions` | none | `UserPermissionsResponse` |
| `PUT` | `/api/users/me` | `ProfileUpdateRequest` | `UserResponse` |
| `PUT` | `/api/users/me/password` | `PasswordUpdateRequest` | `204 No Content` |
| `GET` | `/api/users/{id}` | none | `UserResponse` |
| `GET` | `/api/users/search?email=` | query | `UserResponse` |
| `POST` | `/api/users` | `UserRequest` | `UserResponse` |
| `PUT` | `/api/users/{id}` | `UserRequest` | `UserResponse` |
| `PATCH` | `/api/users/{id}/status` | `UserStatusRequest` | `UserResponse` |
| `DELETE` | `/api/users/{id}` | none | `204 No Content` |

## Farms

Read access: all authenticated roles. Write access: `SUPER_ADMIN`, `ADMIN`.

| Method | Endpoint | Request | Response |
| --- | --- | --- | --- |
| `GET` | `/api/farms` | none | `List<FarmResponse>` |
| `GET` | `/api/farms/{id}` | none | `FarmResponse` |
| `POST` | `/api/farms` | `FarmRequest` | `FarmResponse` |
| `PUT` | `/api/farms/{id}` | `FarmRequest` | `FarmResponse` |
| `DELETE` | `/api/farms/{id}` | none | `204 No Content` |

## Stations

Read access: all authenticated roles. Write access: `SUPER_ADMIN`, `ADMIN`.

| Method | Endpoint | Request | Response |
| --- | --- | --- | --- |
| `GET` | `/api/stations?farmId=` | optional query | `List<StationResponse>` |
| `GET` | `/api/stations/{id}` | none | `StationResponse` |
| `POST` | `/api/stations` | `StationRequest` | `StationResponse` |
| `PUT` | `/api/stations/{id}` | `StationRequest` | `StationResponse` |
| `DELETE` | `/api/stations/{id}` | none | `204 No Content` |

## Measurement Variables

Base paths: `/api/measurement-variables` and legacy alias `/api/sensors`.

Read access: all authenticated roles. Write access: `SUPER_ADMIN`, `ADMIN`.

| Method | Endpoint | Request | Response |
| --- | --- | --- | --- |
| `GET` | `/api/measurement-variables?stationId=&active=&search=` | optional query | `List<MeasurementVariableResponse>` |
| `GET` | `/api/measurement-variables/{id}` | none | `MeasurementVariableResponse` |
| `PUT` | `/api/measurement-variables/{id}` | `MeasurementVariableRequest` | `MeasurementVariableResponse` |

## Measurements

Read access: all authenticated roles. Write access: `SUPER_ADMIN`, `ADMIN`.

| Method | Endpoint | Request | Response |
| --- | --- | --- | --- |
| `GET` | `/api/measurements` | optional filters | `List<MeasurementResponse>` |
| `GET` | `/api/measurements/{variableId}/{time}` | path variables | `MeasurementResponse` |
| `POST` | `/api/measurements` | `MeasurementRequest` | `MeasurementResponse` |
| `PUT` | `/api/measurements/{variableId}/{time}` | `MeasurementRequest` | `MeasurementResponse` |
| `DELETE` | `/api/measurements/{variableId}/{time}` | none | `204 No Content` |

Supported query filters include `variableId`, legacy `sensorId`, `stationId`, `variableIds`, `start`, `end`, and `measurementTypes`.

## Alerts

Read access: all authenticated roles. Write access: `SUPER_ADMIN`, `ADMIN`.

| Method | Endpoint | Request | Response |
| --- | --- | --- | --- |
| `GET` | `/api/alerts?variableId=&sensorId=` | optional query | `List<AlertResponse>` |
| `GET` | `/api/alerts/{id}` | none | `AlertResponse` |
| `POST` | `/api/alerts` | `AlertRequest` | `AlertResponse` |
| `PUT` | `/api/alerts/{id}` | `AlertRequest` | `AlertResponse` |
| `DELETE` | `/api/alerts/{id}` | none | `204 No Content` |

## Import Logs

Read access: all authenticated roles. Write access: `SUPER_ADMIN`, `ADMIN`.

| Method | Endpoint | Request | Response |
| --- | --- | --- | --- |
| `GET` | `/api/import-logs` | none | `List<ImportLogResponse>` |
| `GET` | `/api/import-logs/{id}` | none | `ImportLogResponse` |
| `GET` | `/api/import-logs/search?batchId=` | query | `ImportLogResponse` |
| `POST` | `/api/import-logs` | `ImportLogRequest` | `ImportLogResponse` |
| `PUT` | `/api/import-logs/{id}` | `ImportLogRequest` | `ImportLogResponse` |
| `DELETE` | `/api/import-logs/{id}` | none | `204 No Content` |

## Importer Monitoring

Security: `GET /api/importer/**` requires `SUPER_ADMIN` or `ADMIN`.

| Method | Endpoint | Request | Response |
| --- | --- | --- | --- |
| `GET` | `/api/importer/status` | none | `ImporterStatusResponse` |
| `GET` | `/api/importer/logs?status=&filename=&start=&end=&page=&size=&sort=` | optional query and pageable | `ImporterLogPageResponse` |
| `GET` | `/api/importer/files` | none | `List<ImporterFileResponse>` |

## DTO Validation

Request DTOs use Jakarta Bean Validation. Confirmed validation includes:

- email format validation on login, register, user, and profile requests;
- required names, roles, statuses, timestamps, and passwords;
- password length from 8 to 128 characters;
- maximum lengths for names, emails, station codes, alert type, farm fields, and variable metadata.
