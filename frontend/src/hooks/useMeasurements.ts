import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import { measurementService } from "@/services/measurementService";
import type { Measurement, MeasurementFilters } from "@/types/measurement";

export function useMeasurements(filters: MeasurementFilters = {}, enabled = true) {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMeasurements = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await measurementService.findAll({
        variableId: filters.variableId,
        stationId: filters.stationId,
        variableIds: filters.variableIds,
        start: filters.start,
        end: filters.end,
      });
      setMeasurements(data);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [filters.end, filters.start, filters.stationId, filters.variableId, filters.variableIds]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!enabled) {
        setMeasurements([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await measurementService.findAll({
          variableId: filters.variableId,
          stationId: filters.stationId,
          variableIds: filters.variableIds,
          start: filters.start,
          end: filters.end,
        });
        if (!ignore) {
          setMeasurements(data);
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
  }, [enabled, filters.end, filters.start, filters.stationId, filters.variableId, filters.variableIds]);

  return { measurements, isLoading, error, loadMeasurements };
}
