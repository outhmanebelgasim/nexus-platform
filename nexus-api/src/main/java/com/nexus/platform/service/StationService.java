package com.nexus.platform.service;

import com.nexus.platform.dto.station.StationRequest;
import com.nexus.platform.dto.station.StationResponse;

import java.util.List;

public interface StationService {

    List<StationResponse> findAll();

    List<StationResponse> findAll(String currentUserEmail);

    StationResponse findById(Long id);

    StationResponse findById(Long id, String currentUserEmail);

    List<StationResponse> findByFarmId(Long farmId);

    List<StationResponse> findByFarmId(Long farmId, String currentUserEmail);

    StationResponse create(StationRequest request);

    StationResponse update(Long id, StationRequest request);

    void delete(Long id);
}
