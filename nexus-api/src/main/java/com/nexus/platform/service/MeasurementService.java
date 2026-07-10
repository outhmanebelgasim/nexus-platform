package com.nexus.platform.service;

import com.nexus.platform.dto.measurement.MeasurementRequest;
import com.nexus.platform.dto.measurement.MeasurementResponse;

import java.time.Instant;
import java.util.List;

public interface MeasurementService {

    List<MeasurementResponse> findAll();

    List<MeasurementResponse> findAll(String currentUserEmail);

    MeasurementResponse findById(Instant time, Long sensorId);

    MeasurementResponse findById(Instant time, Long sensorId, String currentUserEmail);

    List<MeasurementResponse> findBySensorId(Long sensorId);

    List<MeasurementResponse> findBySensorId(Long sensorId, String currentUserEmail, List<String> measurementTypes);

    List<MeasurementResponse> findBySensorIdAndTimeBetween(Long sensorId, Instant start, Instant end);

    List<MeasurementResponse> findBySensorIdAndTimeBetween(Long sensorId, Instant start, Instant end, String currentUserEmail, List<String> measurementTypes);

    MeasurementResponse create(MeasurementRequest request);

    MeasurementResponse update(Instant time, Long sensorId, MeasurementRequest request);

    void delete(Instant time, Long sensorId);
}
