import type { Farm } from "@/types/farm";
import type { SensorStatus } from "@/types/sensor";
import type { Station, StationStatus } from "@/types/station";

export function formatStatus(value: StationStatus | SensorStatus) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getFarmName(farms: Farm[], farmId: number) {
  return farms.find((farm) => farm.id === farmId)?.name ?? `Farm #${farmId}`;
}

export function getStationName(stations: Station[], stationId: number) {
  const station = stations.find((item) => item.id === stationId);
  return station ? `${station.name} (${station.code})` : `Station #${stationId}`;
}
