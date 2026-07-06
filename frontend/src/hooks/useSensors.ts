import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import { sensorService } from "@/services/sensorService";
import type { Sensor, SensorPayload } from "@/types/sensor";

export function useSensors(stationId?: number) {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

  const createSensor = async (payload: SensorPayload) => {
    setIsSaving(true);
    setError(null);

    try {
      const createdSensor = await sensorService.create(payload);
      setSensors((currentSensors) => [createdSensor, ...currentSensors]);
    } catch (saveError) {
      const message = getApiErrorMessage(saveError);
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateSensor = async (id: number, payload: SensorPayload) => {
    setIsSaving(true);
    setError(null);

    try {
      const updatedSensor = await sensorService.update(id, payload);
      setSensors((currentSensors) => currentSensors.map((sensor) => (sensor.id === id ? updatedSensor : sensor)));
    } catch (saveError) {
      const message = getApiErrorMessage(saveError);
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSensor = async (id: number) => {
    setIsSaving(true);
    setError(null);

    try {
      await sensorService.remove(id);
      setSensors((currentSensors) => currentSensors.filter((sensor) => sensor.id !== id));
    } catch (deleteError) {
      const message = getApiErrorMessage(deleteError);
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    sensors,
    isLoading,
    isSaving,
    error,
    loadSensors,
    createSensor,
    updateSensor,
    deleteSensor,
  };
}
