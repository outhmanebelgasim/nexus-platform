package com.nexus.platform.service;

import com.nexus.platform.dto.sensor.SensorRequest;
import com.nexus.platform.dto.sensor.SensorResponse;

import java.util.List;

public interface SensorService {

    List<SensorResponse> findAll();

    SensorResponse findById(Long id);

    List<SensorResponse> findByStationId(Long stationId);

    SensorResponse create(SensorRequest request);

    SensorResponse update(Long id, SensorRequest request);

    void delete(Long id);
}
