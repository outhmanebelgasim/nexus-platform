import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import { stationService } from "@/services/stationService";
import type { Station, StationPayload } from "@/types/station";

export function useStations(farmId?: number) {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await stationService.findAll(farmId);
      setStations(data);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await stationService.findAll(farmId);
        if (!ignore) {
          setStations(data);
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
  }, [farmId]);

  const createStation = async (payload: StationPayload) => {
    setIsSaving(true);
    setError(null);

    try {
      const createdStation = await stationService.create(payload);
      setStations((currentStations) => [createdStation, ...currentStations]);
    } catch (saveError) {
      const message = getApiErrorMessage(saveError);
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateStation = async (id: number, payload: StationPayload) => {
    setIsSaving(true);
    setError(null);

    try {
      const updatedStation = await stationService.update(id, payload);
      setStations((currentStations) =>
        currentStations.map((station) => (station.id === id ? updatedStation : station)),
      );
    } catch (saveError) {
      const message = getApiErrorMessage(saveError);
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteStation = async (id: number) => {
    setIsSaving(true);
    setError(null);

    try {
      await stationService.remove(id);
      setStations((currentStations) => currentStations.filter((station) => station.id !== id));
    } catch (deleteError) {
      const message = getApiErrorMessage(deleteError);
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    stations,
    isLoading,
    isSaving,
    error,
    loadStations,
    createStation,
    updateStation,
    deleteStation,
  };
}
