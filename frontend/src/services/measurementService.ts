import { apiClient } from "@/lib/api";
import type { Measurement, MeasurementFilters } from "@/types/measurement";

const MEASUREMENTS_ENDPOINT = "/api/measurements";

export const measurementService = {
  async findAll(filters: MeasurementFilters = {}) {
    const response = await apiClient.get<Measurement[]>(MEASUREMENTS_ENDPOINT, {
      params: {
        sensorId: filters.sensorId,
        start: filters.start,
        end: filters.end,
        measurementTypes: filters.measurementTypes,
      },
    });
    return response.data;
  },

  async findAnalytics(filters: MeasurementFilters & { sensorIds?: number[] } = {}) {
    if (!filters.sensorIds || filters.sensorIds.length === 0) {
      return this.findAll(filters);
    }

    const responses = await Promise.all(
      filters.sensorIds.map((sensorId) =>
        this.findAll({
          sensorId,
          start: filters.start,
          end: filters.end,
          measurementTypes: filters.measurementTypes,
        }),
      ),
    );

    return responses.flat();
  },
};
