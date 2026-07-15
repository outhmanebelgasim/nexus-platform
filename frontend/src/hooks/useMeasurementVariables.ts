import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import { measurementVariableService, type MeasurementVariableFilters } from "@/services/measurementVariableService";
import type { MeasurementVariable } from "@/types/measurementVariable";

export function useMeasurementVariables(filters: MeasurementVariableFilters = {}) {
  const [variables, setVariables] = useState<MeasurementVariable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stationId = filters.stationId;
  const active = filters.active;
  const search = filters.search;

  const loadVariables = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setVariables(await measurementVariableService.findAll({ stationId, active, search }));
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [active, search, stationId]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await measurementVariableService.findAll({ stationId, active, search });
        if (!ignore) {
          setVariables(data);
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
  }, [active, search, stationId]);

  return {
    variables,
    isLoading,
    error,
    loadVariables,
    setVariables,
  };
}
