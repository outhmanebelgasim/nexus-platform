package com.nexus.platform.service;

import com.nexus.platform.dto.alert.AlertRequest;
import com.nexus.platform.dto.alert.AlertResponse;

import java.util.List;

public interface AlertService {

    List<AlertResponse> findAll();

    List<AlertResponse> findAll(String currentUserEmail);

    AlertResponse findById(Long id);

    AlertResponse findById(Long id, String currentUserEmail);

    List<AlertResponse> findBySensorId(Long sensorId);

    List<AlertResponse> findBySensorId(Long sensorId, String currentUserEmail);

    AlertResponse create(AlertRequest request);

    AlertResponse update(Long id, AlertRequest request);

    void delete(Long id);
}
