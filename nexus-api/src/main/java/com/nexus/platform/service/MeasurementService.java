package com.nexus.platform.service;

import com.nexus.platform.dto.measurement.MeasurementRequest;
import com.nexus.platform.dto.measurement.MeasurementResponse;

import java.time.Instant;
import java.util.List;

public interface MeasurementService {

    List<MeasurementResponse> findAll();

    List<MeasurementResponse> findAll(String currentUserEmail);

    MeasurementResponse findById(Instant time, Long variableId);

    MeasurementResponse findById(Instant time, Long variableId, String currentUserEmail);

    List<MeasurementResponse> findByVariableId(Long variableId);

    List<MeasurementResponse> findByVariableId(Long variableId, String currentUserEmail, List<String> measurementTypes);

    List<MeasurementResponse> findByVariableIdAndTimeBetween(Long variableId, Instant start, Instant end);

    List<MeasurementResponse> findByVariableIdAndTimeBetween(Long variableId, Instant start, Instant end, String currentUserEmail, List<String> measurementTypes);

    MeasurementResponse create(MeasurementRequest request);

    MeasurementResponse update(Instant time, Long variableId, MeasurementRequest request);

    void delete(Instant time, Long variableId);
}
