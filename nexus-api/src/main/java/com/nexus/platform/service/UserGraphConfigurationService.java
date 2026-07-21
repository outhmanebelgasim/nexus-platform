package com.nexus.platform.service;

import com.nexus.domain.enums.StationCategory;
import com.nexus.platform.dto.graph.RestrictedGraphMeasurementResponse;
import com.nexus.platform.dto.graph.UserGraphConfigurationRequest;
import com.nexus.platform.dto.graph.UserGraphConfigurationResponse;
import com.nexus.platform.dto.station.StationResponse;

import java.util.List;

public interface UserGraphConfigurationService {

    List<UserGraphConfigurationResponse> findForUser(Long userId, String currentUserEmail);

    UserGraphConfigurationResponse create(Long userId, UserGraphConfigurationRequest request, String currentUserEmail);

    UserGraphConfigurationResponse update(Long userId, Long graphId, UserGraphConfigurationRequest request, String currentUserEmail);

    void delete(Long userId, Long graphId, String currentUserEmail);

    List<UserGraphConfigurationResponse> reorder(Long userId, List<Long> graphIds, String currentUserEmail);

    List<StationCategory> currentStationCategories(String currentUserEmail);

    List<StationResponse> currentStations(StationCategory category, String currentUserEmail);

    List<UserGraphConfigurationResponse> currentGraphConfigurations(StationCategory category, String currentUserEmail);

    List<UserGraphConfigurationResponse> currentStationGraphConfigurations(Long stationId, String currentUserEmail);

    RestrictedGraphMeasurementResponse currentGraphMeasurements(Long stationId, Long graphId, String range, String currentUserEmail);
}
