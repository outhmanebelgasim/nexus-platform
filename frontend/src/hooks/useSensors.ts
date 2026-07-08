import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import { sensorService } from "@/services/sensorService";
import type { Sensor } from "@/types/sensor";

export function useSensors(stationId?: number) {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSensors = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await sensorService.findAll(stationId);
      setSensors(data);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await sensorService.findAll(stationId);
        if (!ignore) {
          setSensors(data);
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
  }, [stationId]);

  return {
    sensors,
    isLoading,
    error,
    loadSensors,
  };
}
