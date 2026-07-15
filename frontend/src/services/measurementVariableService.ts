import { apiClient } from "@/lib/api";
import type { MeasurementVariable, MeasurementVariablePayload } from "@/types/measurementVariable";

const MEASUREMENT_VARIABLES_ENDPOINT = "/api/measurement-variables";

export interface MeasurementVariableFilters {
  stationId?: number;
  active?: boolean;
  search?: string;
}

export const measurementVariableService = {
  async findAll(filters: MeasurementVariableFilters = {}) {
    const response = await apiClient.get<MeasurementVariable[]>(MEASUREMENT_VARIABLES_ENDPOINT, {
      params: {
        stationId: filters.stationId,
        active: filters.active,
        search: filters.search || undefined,
      },
    });
    return response.data;
  },

  async update(id: number, payload: MeasurementVariablePayload) {
    const response = await apiClient.put<MeasurementVariable>(`${MEASUREMENT_VARIABLES_ENDPOINT}/${id}`, payload);
    return response.data;
  },
};
