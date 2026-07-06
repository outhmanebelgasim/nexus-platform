import { apiClient } from "@/lib/api";
import type { AlertEvent } from "@/types/alert";

const ALERTS_ENDPOINT = "/api/alerts";

export const alertService = {
  async findAll(sensorId?: number) {
    const response = await apiClient.get<AlertEvent[]>(ALERTS_ENDPOINT, {
      params: sensorId ? { sensorId } : undefined,
    });
    return response.data;
  },
};
