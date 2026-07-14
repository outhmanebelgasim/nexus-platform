package com.nexus.platform.service;

import com.nexus.platform.dto.measurementvariable.MeasurementVariableRequest;
import com.nexus.platform.dto.measurementvariable.MeasurementVariableResponse;

import java.util.List;

public interface MeasurementVariableService {

    List<MeasurementVariableResponse> findAll();

    List<MeasurementVariableResponse> findAll(String currentUserEmail);

    MeasurementVariableResponse findById(Long id);

    MeasurementVariableResponse findById(Long id, String currentUserEmail);

    List<MeasurementVariableResponse> findByStationId(Long stationId);

    List<MeasurementVariableResponse> findByStationId(Long stationId, String currentUserEmail);

    MeasurementVariableResponse update(Long id, MeasurementVariableRequest request);
}
