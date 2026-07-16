import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import { importerMonitoringService } from "@/services/importerMonitoringService";
import type { ImporterFileState, ImporterLogFilters, ImporterLogPage, ImporterStatus } from "@/types/importerMonitoring";

const emptyLogPage: ImporterLogPage = {
  content: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
};

export function useImporterMonitoring(filters: ImporterLogFilters) {
  const [status, setStatus] = useState<ImporterStatus | null>(null);
  const [logs, setLogs] = useState<ImporterLogPage>(emptyLogPage);
  const [files, setFiles] = useState<ImporterFileState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMonitoring = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [statusData, logsData, filesData] = await Promise.all([
        importerMonitoringService.getStatus(),
        importerMonitoringService.getLogs(filters),
        importerMonitoringService.getFiles(),
      ]);
      setStatus(statusData);
      setLogs(logsData);
      setFiles(filesData);
    } catch (loadError) {
      setError(
        getApiErrorMessage(loadError, {
          forbidden: "Importer monitoring is available only to administrators.",
          serverError: "Unable to load importer monitoring data right now.",
        }),
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const [statusData, logsData, filesData] = await Promise.all([
          importerMonitoringService.getStatus(),
          importerMonitoringService.getLogs(filters),
          importerMonitoringService.getFiles(),
        ]);
        if (!ignore) {
          setStatus(statusData);
          setLogs(logsData);
          setFiles(filesData);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(
            getApiErrorMessage(loadError, {
              forbidden: "Importer monitoring is available only to administrators.",
              serverError: "Unable to load importer monitoring data right now.",
            }),
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [filters]);

  return { status, logs, files, isLoading, error, loadMonitoring };
}
