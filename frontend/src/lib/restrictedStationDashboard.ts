import type { RestrictedGraphRange, StationCategory, UserGraphConfiguration } from "@/types/graph";
import type { MeasurementVariable } from "@/types/measurementVariable";
import type { Station } from "@/types/station";

export type GraphMeasurementStatus = "idle" | "loading" | "ready" | "empty" | "error";

export interface GraphMeasurementState {
  status: GraphMeasurementStatus;
  message?: string;
}

export function parseStationRouteId(value: string | undefined) {
  if (!value) {
    return null;
  }

  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function stationGraphsPath(stationId: number) {
  return `/api/me/stations/${stationId}/graphs`;
}

export function graphMeasurementsPath(stationId: number, graphId: number) {
  return `/api/me/stations/${stationId}/graphs/${graphId}/measurements`;
}

export function graphMeasurementsParams(range: RestrictedGraphRange) {
  return { range };
}

export function filterStationsByCategory(stations: Station[], category: StationCategory) {
  return stations.filter((station) => station.stationCategory === category);
}

export function filterVariablesForGraphStation(
  variables: MeasurementVariable[],
  stations: Station[],
  stationId: number | null,
  category: StationCategory,
) {
  if (!stationId) {
    return [];
  }

  const station = stations.find((item) => item.id === stationId);
  if (!station || station.stationCategory !== category) {
    return [];
  }

  return variables.filter((variable) => variable.stationId === stationId && variable.active);
}

export function keepValidVariableIds(selectedIds: number[], availableVariables: MeasurementVariable[]) {
  const availableIds = new Set(availableVariables.map((variable) => variable.id));
  return selectedIds.filter((id) => availableIds.has(id));
}

export function graphUsesOnlyAssignedVariables(graph: UserGraphConfiguration, variableIds: number[], variableByCode: Map<string, MeasurementVariable>) {
  const assignedCodes = new Set(graph.variables.map((variable) => variable.variableCode));
  return variableIds.every((variableId) => {
    const variable = Array.from(variableByCode.values()).find((item) => item.id === variableId);
    return variable ? assignedCodes.has(variable.code) : false;
  });
}
