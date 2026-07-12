import type { Role } from "@/types/user";

export const ALL_AUTHENTICATED_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "TECHNICIAN", "VIEWER"];
export const ADMINISTRATION_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN"];
export const OPERATIONAL_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "TECHNICIAN"];

export const navigationAccess = {
  dashboard: ALL_AUTHENTICATED_ROLES,
  farms: ADMINISTRATION_ROLES,
  stations: ALL_AUTHENTICATED_ROLES,
  sensors: ALL_AUTHENTICATED_ROLES,
  measurements: ALL_AUTHENTICATED_ROLES,
  alerts: ALL_AUTHENTICATED_ROLES,
  importLogs: OPERATIONAL_ROLES,
  users: ADMINISTRATION_ROLES,
} as const satisfies Record<string, Role[]>;
