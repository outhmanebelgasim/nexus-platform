# Frontend

## Module

The frontend is in `frontend/`. It is a React 19 and TypeScript application built with Vite.

## Folder Organization

| Folder | Responsibility |
| --- | --- |
| `src/pages` | Route-level screens. |
| `src/components` | Reusable UI, domain tables/forms, chart components, auth route wrapper. |
| `src/hooks` | Data-fetching and UI state hooks. |
| `src/services` | API service wrappers over Axios. |
| `src/types` | TypeScript API/domain types. |
| `src/layouts` | Authenticated dashboard layout. |
| `src/lib` | API client, auth token utilities, route access matrix, theme, utilities. |
| `src/utils` | Formatting and label helpers. |

## Routing

Routes are defined in `src/App.tsx`.

| Route | Page |
| --- | --- |
| `/login` | `LoginPage` |
| `/register` | `RegisterPage` |
| `/dashboard` | `DashboardPage` |
| `/farms` | `FarmsPage` |
| `/stations` | `StationsPage` |
| `/variables` | `VariablesPage` |
| `/sensors` | Redirects to `/variables` |
| `/measurements` | `MeasurementsPage` |
| `/alerts` | `AlertsPage` |
| `/import-monitoring` | `ImporterMonitoringPage` |
| `/import-logs` | Redirects to `/import-monitoring` |
| `/settings` | `SettingsPage` |
| `/users` | `UsersPage` |

Authenticated routes are wrapped with `ProtectedRoute` and `DashboardLayout`.

## Layouts

`DashboardLayout` provides the authenticated application shell. Route visibility is coordinated with `navigationAccess`.

## Pages

- `DashboardPage`: operational overview.
- `FarmsPage`: farm management.
- `StationsPage`: station management.
- `VariablesPage`: measurement-variable management.
- `MeasurementsPage`: on-demand measurement analytics and charting.
- `AlertsPage`: alert monitoring.
- `ImporterMonitoringPage`: administrator importer status/log/file monitoring.
- `UsersPage`: user administration and access assignment.
- `SettingsPage`: profile and password settings.

## Authentication

`AuthProvider` loads the current user from the stored token, exposes login/logout methods, and keeps user state in React context. `ProtectedRoute` blocks unauthenticated access and supports role-based route protection.

## API Integration

`src/lib/api.ts` creates a shared Axios client. It:

- uses `VITE_API_BASE_URL` when provided;
- attaches `Authorization: Bearer <token>` to protected requests;
- skips bearer token injection for login and register;
- clears the stored token and redirects to `/login` on `401`.

Service files encapsulate backend calls by domain:

- `authService`
- `farmService`
- `stationService`
- `measurementVariableService`
- `measurementService`
- `alertService`
- `importLogService`
- `importerMonitoringService`
- `userService`

## Components

Reusable shared components include:

- `PageHeader`
- `MetricCard`
- `LoadingState`
- `EmptyState`
- `PaginationControls`
- `SearchInput`
- `StatusBadge`
- `OperationalBadge`

Domain components include farm/station forms and tables, variable tables, measurement tables, import-log tables, and measurement-chart components.

## Charts

Charts are implemented with custom React SVG components, especially `MeasurementChart` and `MeasurementTrend`. No external charting dependency is declared in `frontend/package.json`.

## State Management

The app uses local React state, context for authentication/toasts, and custom hooks for data loading. No Redux, Zustand, MobX, or React Query dependency was found.

## Authorization in UI

`navigationAccess` centralizes route role groups:

- all authenticated roles: dashboard, stations, variables, measurements, alerts;
- administration roles: farms, importer monitoring, users.
