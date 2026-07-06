import { apiClient } from "@/lib/api";
import type { Farm, FarmPayload } from "@/types/farm";

const FARMS_ENDPOINT = "/api/farms";

export const farmService = {
  async findAll() {
    const response = await apiClient.get<Farm[]>(FARMS_ENDPOINT);
    return response.data;
  },

  async create(payload: FarmPayload) {
    const response = await apiClient.post<Farm>(FARMS_ENDPOINT, payload);
    return response.data;
  },

  async update(id: number, payload: FarmPayload) {
    const response = await apiClient.put<Farm>(`${FARMS_ENDPOINT}/${id}`, payload);
    return response.data;
  },

  async remove(id: number) {
    await apiClient.delete(`${FARMS_ENDPOINT}/${id}`);
  },
};
