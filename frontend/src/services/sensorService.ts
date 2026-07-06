import { apiClient } from "@/lib/api";
import type { Sensor, SensorPayload } from "@/types/sensor";

const SENSORS_ENDPOINT = "/api/sensors";

export const sensorService = {
  async findAll(stationId?: number) {
    const response = await apiClient.get<Sensor[]>(SENSORS_ENDPOINT, {
      params: stationId ? { stationId } : undefined,
    });
    return response.data;
  },

  async create(payload: SensorPayload) {
    const response = await apiClient.post<Sensor>(SENSORS_ENDPOINT, payload);
    return response.data;
  },

  async update(id: number, payload: SensorPayload) {
    const response = await apiClient.put<Sensor>(`${SENSORS_ENDPOINT}/${id}`, payload);
    return response.data;
  },

  async remove(id: number) {
    await apiClient.delete(`${SENSORS_ENDPOINT}/${id}`);
  },
};
