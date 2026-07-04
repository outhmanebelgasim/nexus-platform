package com.nexus.platform.service;

import com.nexus.platform.dto.alert.AlertRequest;
import com.nexus.platform.dto.alert.AlertResponse;

import java.util.List;

public interface AlertService {

    List<AlertResponse> findAll();

    AlertResponse findById(Long id);

    List<AlertResponse> findBySensorId(Long sensorId);

    AlertResponse create(AlertRequest request);

    AlertResponse update(Long id, AlertRequest request);

    void delete(Long id);
}
