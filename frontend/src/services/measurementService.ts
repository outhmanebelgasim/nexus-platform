import { apiClient } from "@/lib/api";
import type { Measurement, MeasurementFilters } from "@/types/measurement";

const MEASUREMENTS_ENDPOINT = "/api/measurements";

export const measurementService = {
  async findAll(filters: MeasurementFilters = {}) {
    const response = await apiClient.get<Measurement[]>(MEASUREMENTS_ENDPOINT, {
      params: {
        variableId: filters.variableId,
        stationId: filters.stationId,
        variableIds: filters.variableIds,
        start: filters.start,
        end: filters.end,
        measurementTypes: filters.measurementTypes,
      },
    });
    return response.data;
  },

  async findAnalytics(filters: MeasurementFilters = {}) {
    if (filters.stationId && filters.start && filters.end) {
      return this.findAll(filters);
    }

    if (!filters.variableIds || filters.variableIds.length === 0) {
      return this.findAll(filters);
    }

    const responses = await Promise.all(
      filters.variableIds.map((variableId) =>
        this.findAll({
          variableId,
          start: filters.start,
          end: filters.end,
          measurementTypes: filters.measurementTypes,
        }),
      ),
    );

    return responses.flat();
  },
};
