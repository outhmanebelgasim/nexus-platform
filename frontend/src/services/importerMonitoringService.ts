import { apiClient } from "@/lib/api";
import type { ImporterFileState, ImporterLogFilters, ImporterLogPage, ImporterStatus } from "@/types/importerMonitoring";

const IMPORTER_ENDPOINT = "/api/importer";

function serializeImporterParams(params: Record<string, unknown>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    searchParams.append(key, String(value));
  });

  return searchParams.toString();
}

export const importerMonitoringService = {
  async getStatus() {
    const response = await apiClient.get<ImporterStatus>(`${IMPORTER_ENDPOINT}/status`);
    return response.data;
  },

  async getLogs(filters: ImporterLogFilters = {}) {
    const response = await apiClient.get<ImporterLogPage>(`${IMPORTER_ENDPOINT}/logs`, {
      params: {
        status: filters.status,
        filename: filters.filename,
        start: filters.start,
        end: filters.end,
        page: filters.page ?? 0,
        size: filters.size ?? 20,
      },
      paramsSerializer: {
        serialize: serializeImporterParams,
      },
    });
    return response.data;
  },

  async getFiles() {
    const response = await apiClient.get<ImporterFileState[]>(`${IMPORTER_ENDPOINT}/files`);
    return response.data;
  },
};
