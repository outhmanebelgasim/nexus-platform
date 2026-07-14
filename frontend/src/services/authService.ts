import { apiClient, getApiErrorMessage } from "@/lib/api";
import { clearStoredToken, storeToken } from "@/lib/authToken";
import type { LoginRequest, LoginResponse, RegisterRequest, User } from "@/types/user";

export const authService = {
  async login(payload: LoginRequest) {
    try {
      const response = await apiClient.post<LoginResponse>("/api/auth/login", payload);
      storeToken(response.data.token);
      return response.data;
    } catch (error) {
      throw new Error(
        getApiErrorMessage(error, {
          unauthorized: "Invalid email or password.",
          forbidden: "Login failed with 403 Forbidden. Check the API CORS configuration and authentication endpoint access.",
          serverError: "Sign in is temporarily unavailable. Please try again in a few moments.",
        }),
      );
    }
  },

  async logout() {
    try {
      await apiClient.post("/api/auth/logout");
    } finally {
      clearStoredToken();
    }
  },

  async register(payload: RegisterRequest) {
    try {
      const response = await apiClient.post<User>("/api/auth/register", payload);
      return response.data;
    } catch (error) {
      throw new Error(
        getApiErrorMessage(error, {
          badRequest: "Please complete all required fields.",
          conflict: "An account with this email already exists.",
          forbidden: "Registration failed with 403 Forbidden. Check the API CORS configuration and authentication endpoint access.",
          serverError: "Something went wrong on our side. Please try again in a few moments.",
        }),
      );
    }
  },

  async getCurrentUser() {
    try {
      const response = await apiClient.get<User>("/api/auth/me");
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },
};
