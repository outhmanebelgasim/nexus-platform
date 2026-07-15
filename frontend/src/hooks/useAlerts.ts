import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import { alertService } from "@/services/alertService";
import type { AlertEvent } from "@/types/alert";

export function useAlerts(variableId?: number, enabled = true) {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await alertService.findAll(variableId);
      setAlerts(data);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [variableId]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!enabled) {
        setAlerts([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await alertService.findAll(variableId);
        if (!ignore) {
          setAlerts(data);
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
  }, [enabled, variableId]);

  return { alerts, isLoading, error, loadAlerts };
}
