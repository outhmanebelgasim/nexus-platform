import { useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import { measurementService } from "@/services/measurementService";
import type { Measurement, MeasurementAnalyticsFilters } from "@/types/measurement";

export function useMeasurementAnalytics() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generateChart = async (filters: MeasurementAnalyticsFilters, sensorIds: number[]) => {
    setIsLoading(true);
    setError(null);
    setHasGenerated(true);

    try {
      const data = await measurementService.findAnalytics({
        sensorIds,
        start: filters.start,
        end: filters.end,
        measurementTypes: filters.measurementTypes,
      });
      setMeasurements(data);
    } catch (loadError) {
      setMeasurements([]);
      setError(getApiErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  };

  return { measurements, isLoading, error, hasGenerated, generateChart };
}
