import { apiClient } from "@/lib/api";
import { graphMeasurementsParams, graphMeasurementsPath, stationGraphsPath } from "@/lib/restrictedStationDashboard";
import type { RestrictedGraphMeasurement, RestrictedGraphRange, StationCategory, UserGraphConfiguration, UserGraphPayload } from "@/types/graph";
import type { Station } from "@/types/station";

export const graphService = {
  async findForUser(userId: number) {
    const response = await apiClient.get<UserGraphConfiguration[]>(`/api/users/${userId}/graph-configurations`);
    return response.data;
  },

  async createForUser(userId: number, payload: UserGraphPayload) {
    const response = await apiClient.post<UserGraphConfiguration>(`/api/users/${userId}/graph-configurations`, payload);
    return response.data;
  },

  async updateForUser(userId: number, graphId: number, payload: UserGraphPayload) {
    const response = await apiClient.put<UserGraphConfiguration>(`/api/users/${userId}/graph-configurations/${graphId}`, payload);
    return response.data;
  },

  async removeForUser(userId: number, graphId: number) {
    await apiClient.delete(`/api/users/${userId}/graph-configurations/${graphId}`);
  },

  async currentCategories() {
    const response = await apiClient.get<StationCategory[]>("/api/me/station-categories");
    return response.data;
  },

  async currentStations(category: StationCategory) {
    const response = await apiClient.get<Station[]>("/api/me/stations", { params: { category } });
    return response.data;
  },

  async currentGraphs(category: StationCategory) {
    const response = await apiClient.get<UserGraphConfiguration[]>("/api/me/graph-configurations", { params: { category } });
    return response.data;
  },

  async currentStationGraphs(stationId: number) {
    const response = await apiClient.get<UserGraphConfiguration[]>(stationGraphsPath(stationId));
    return response.data;
  },

  async currentGraphMeasurements(stationId: number, graphId: number, range: RestrictedGraphRange) {
    const response = await apiClient.get<RestrictedGraphMeasurement>(graphMeasurementsPath(stationId, graphId), {
      params: graphMeasurementsParams(range),
    });
    return response.data;
  },
};
