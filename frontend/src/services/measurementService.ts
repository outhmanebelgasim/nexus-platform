import { apiClient } from "@/lib/api";
import type { Measurement, MeasurementFilters } from "@/types/measurement";

const MEASUREMENTS_ENDPOINT = "/api/measurements";

function serializeMeasurementParams(params: Record<string, unknown>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== "") {
          searchParams.append(key, String(item));
        }
      });
      return;
    }

    searchParams.append(key, String(value));
  });

  return searchParams.toString();
}

export function buildMeasurementRequestParams(filters: MeasurementFilters = {}) {
  return {
    variableId: filters.variableId,
    stationId: filters.stationId,
    variableIds: filters.variableIds,
    start: filters.start,
    end: filters.end,
    measurementTypes: filters.measurementTypes,
  };
}

export const measurementService = {
  async findAll(filters: MeasurementFilters = {}) {
    const response = await apiClient.get<Measurement[]>(MEASUREMENTS_ENDPOINT, {
      params: buildMeasurementRequestParams(filters),
      paramsSerializer: {
        serialize: serializeMeasurementParams,
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
