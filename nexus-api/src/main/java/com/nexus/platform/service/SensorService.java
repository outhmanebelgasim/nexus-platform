package com.nexus.platform.service;

import com.nexus.platform.dto.sensor.SensorRequest;
import com.nexus.platform.dto.sensor.SensorResponse;

import java.util.List;

public interface SensorService {

    List<SensorResponse> findAll();

    List<SensorResponse> findAll(String currentUserEmail);

    SensorResponse findById(Long id);

    SensorResponse findById(Long id, String currentUserEmail);

    List<SensorResponse> findByStationId(Long stationId);

    List<SensorResponse> findByStationId(Long stationId, String currentUserEmail);

    SensorResponse create(SensorRequest request);

    SensorResponse update(Long id, SensorRequest request);

    void delete(Long id);
}
