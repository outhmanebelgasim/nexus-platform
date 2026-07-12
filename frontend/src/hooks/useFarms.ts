import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import { farmService } from "@/services/farmService";
import type { Farm, FarmPayload } from "@/types/farm";

export function useFarms(enabled = true) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFarms = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await farmService.findAll();
      setFarms(data);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!enabled) {
        setFarms([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await farmService.findAll();
        if (!ignore) {
          setFarms(data);
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
  }, [enabled]);

  const createFarm = async (payload: FarmPayload) => {
    setIsSaving(true);
    setError(null);

    try {
      const createdFarm = await farmService.create(payload);
      setFarms((currentFarms) => [createdFarm, ...currentFarms]);
    } catch (saveError) {
      const message = getApiErrorMessage(saveError);
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateFarm = async (id: number, payload: FarmPayload) => {
    setIsSaving(true);
    setError(null);

    try {
      const updatedFarm = await farmService.update(id, payload);
      setFarms((currentFarms) =>
        currentFarms.map((farm) => (farm.id === id ? updatedFarm : farm)),
      );
    } catch (saveError) {
      const message = getApiErrorMessage(saveError);
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteFarm = async (id: number) => {
    setIsSaving(true);
    setError(null);

    try {
      await farmService.remove(id);
      setFarms((currentFarms) => currentFarms.filter((farm) => farm.id !== id));
    } catch (deleteError) {
      const message = getApiErrorMessage(deleteError);
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    farms,
    isLoading,
    isSaving,
    error,
    loadFarms,
    createFarm,
    updateFarm,
    deleteFarm,
  };
}
