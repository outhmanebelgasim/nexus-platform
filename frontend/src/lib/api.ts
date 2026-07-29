import axios from "axios";
import { clearStoredToken, getStoredToken } from "@/lib/authToken";

const PUBLIC_AUTH_ENDPOINTS = new Set(["/api/auth/login", "/api/auth/register"]);

function logDevelopmentError(error: unknown) {
  if (import.meta.env.DEV) {
    console.error(error);
  }
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  const url = typeof config.url === "string" ? config.url : "";
  if (token && !PUBLIC_AUTH_ENDPOINTS.has(url)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && window.location.pathname !== "/login") {
      clearStoredToken();
      window.location.assign("/login");
    }

    return Promise.reject(error);
  },
);

type ApiErrorMessages = {
  badRequest?: string;
  conflict?: string;
  forbidden?: string;
  unauthorized?: string;
  serverError?: string;
};

export function getApiErrorMessage(error: unknown, messages: ApiErrorMessages = {}) {
  if (axios.isAxiosError(error)) {
    logDevelopmentError(error);

    if (!error.response) {
      return messages.serverError || "Unable to connect to the server. The request may be blocked by CORS or the API may be unavailable.";
    }

    const backendMessage = error.response.data?.message;
    const message = typeof backendMessage === "string" ? backendMessage : "";

    switch (error.response.status) {
      case 400:
        return message || messages.badRequest || "Please check the required fields.";
      case 401:
        return messages.unauthorized || (window.location.pathname === "/login" ? "Invalid email or password." : "Session expired. Please sign in again.");
      case 403:
        if (message === "Account disabled. Contact administrator.") {
          return "Your account has been disabled. Please contact an administrator.";
        }
        return messages.forbidden || "You do not have permission to perform this action.";
      case 404:
        return message || "Requested resource was not found.";
      case 409:
        return messages.conflict || "An account with this email already exists.";
      case 500:
        return messages.serverError || "Something went wrong on our side. Please try again in a few moments.";
      default:
        return "Unable to complete the request right now. Please try again later.";
    }
  }

  logDevelopmentError(error);
  return "Unable to complete the request right now. Please try again later.";
}
