import { apiClient } from "@/lib/api";
import type { PasswordPayload, ProfilePayload, User, UserPayload, UserStatus } from "@/types/user";

const USERS_ENDPOINT = "/api/users";

export const userService = {
  async findAll() {
    const response = await apiClient.get<User[]>(USERS_ENDPOINT);
    return response.data;
  },

  async findById(id: number) {
    const response = await apiClient.get<User>(`${USERS_ENDPOINT}/${id}`);
    return response.data;
  },

  async currentUser() {
    const response = await apiClient.get<User>(`${USERS_ENDPOINT}/me`);
    return response.data;
  },

  async updateProfile(payload: ProfilePayload) {
    const response = await apiClient.put<User>(`${USERS_ENDPOINT}/me`, payload);
    return response.data;
  },

  async updatePassword(payload: PasswordPayload) {
    await apiClient.put(`${USERS_ENDPOINT}/me/password`, payload);
  },

  async create(payload: UserPayload) {
    const response = await apiClient.post<User>(USERS_ENDPOINT, payload);
    return response.data;
  },

  async update(id: number, payload: UserPayload) {
    const response = await apiClient.put<User>(`${USERS_ENDPOINT}/${id}`, payload);
    return response.data;
  },

  async updateStatus(id: number, status: UserStatus) {
    const response = await apiClient.patch<User>(`${USERS_ENDPOINT}/${id}/status`, { status });
    return response.data;
  },

  async remove(id: number) {
    await apiClient.delete(`${USERS_ENDPOINT}/${id}`);
  },
};
