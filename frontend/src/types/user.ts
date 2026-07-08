export type Role = "SUPER_ADMIN" | "ADMIN" | "TECHNICIAN" | "VIEWER";
export type UserStatus = "ACTIVE" | "DISABLED";

export interface User {
  id: number;
  fullName: string;
  email: string;
  createdById: number | null;
  role: Role;
  status: UserStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UserPayload {
  fullName: string;
  email: string;
  password?: string;
  role: Role;
  status: UserStatus;
}

export interface ProfilePayload {
  fullName: string;
  email: string;
}

export interface PasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}
