package com.nexus.platform.service;

import com.nexus.platform.dto.measurement.MeasurementRequest;
import com.nexus.platform.dto.measurement.MeasurementResponse;

import java.time.Instant;
import java.util.List;

public interface MeasurementService {

    List<MeasurementResponse> findAll();

    MeasurementResponse findById(Instant time, Long sensorId);

    List<MeasurementResponse> findBySensorId(Long sensorId);

    List<MeasurementResponse> findBySensorIdAndTimeBetween(Long sensorId, Instant start, Instant end);

    MeasurementResponse create(MeasurementRequest request);

    MeasurementResponse update(Instant time, Long sensorId, MeasurementRequest request);

    void delete(Instant time, Long sensorId);
}
