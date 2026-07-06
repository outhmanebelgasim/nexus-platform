import { apiClient } from "@/lib/api";
import type { Station, StationPayload } from "@/types/station";

const STATIONS_ENDPOINT = "/api/stations";

export const stationService = {
  async findAll(farmId?: number) {
    const response = await apiClient.get<Station[]>(STATIONS_ENDPOINT, {
      params: farmId ? { farmId } : undefined,
    });
    return response.data;
  },

  async create(payload: StationPayload) {
    const response = await apiClient.post<Station>(STATIONS_ENDPOINT, payload);
    return response.data;
  },

  async update(id: number, payload: StationPayload) {
    const response = await apiClient.put<Station>(`${STATIONS_ENDPOINT}/${id}`, payload);
    return response.data;
  },

  async remove(id: number) {
    await apiClient.delete(`${STATIONS_ENDPOINT}/${id}`);
  },
};
