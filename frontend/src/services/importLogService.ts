import { apiClient } from "@/lib/api";
import type { ImportLog } from "@/types/importLog";

const IMPORT_LOGS_ENDPOINT = "/api/import-logs";

export const importLogService = {
  async findAll() {
    const response = await apiClient.get<ImportLog[]>(IMPORT_LOGS_ENDPOINT);
    return response.data;
  },
};
