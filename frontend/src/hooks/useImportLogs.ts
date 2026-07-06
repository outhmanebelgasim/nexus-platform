import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import { importLogService } from "@/services/importLogService";
import type { ImportLog } from "@/types/importLog";

export function useImportLogs() {
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadImportLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await importLogService.findAll();
      setImportLogs(data);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await importLogService.findAll();
        if (!ignore) {
          setImportLogs(data);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(getApiErrorMessage(loadError));
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
  }, [loadImportLogs]);

  return { importLogs, isLoading, error, loadImportLogs };
}
