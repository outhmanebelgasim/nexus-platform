import { createContext } from "react";
import type { LoginRequest, Role, User } from "@/types/user";

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
