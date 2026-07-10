package com.nexus.platform.service.impl;

import com.nexus.domain.entity.AppUser;
import com.nexus.domain.entity.Alert;
import com.nexus.platform.dto.alert.AlertRequest;
import com.nexus.platform.dto.alert.AlertResponse;
import com.nexus.platform.exception.ResourceNotFoundException;
import com.nexus.platform.mapper.AlertMapper;
import com.nexus.platform.repository.AlertRepository;
import com.nexus.platform.repository.SensorRepository;
import com.nexus.platform.service.AccessControlService;
import com.nexus.platform.service.AlertService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class AlertServiceImpl implements AlertService {

    private final AlertRepository alertRepository;
    private final SensorRepository sensorRepository;
    private final AccessControlService accessControlService;

    public AlertServiceImpl(
            AlertRepository alertRepository,
            SensorRepository sensorRepository,
            AccessControlService accessControlService
    ) {
        this.alertRepository = alertRepository;
        this.sensorRepository = sensorRepository;
        this.accessControlService = accessControlService;
    }

    @Override
    public List<AlertResponse> findAll() {
        return AlertMapper.toResponseList(alertRepository.findAll());
    }

    @Override
    public List<AlertResponse> findAll(String currentUserEmail) {
        AppUser user = accessControlService.findUserByEmail(currentUserEmail);
        if (accessControlService.hasUnrestrictedAccess(user)) {
            return findAll();
        }
        return AlertMapper.toResponseList(alertRepository.findBySensorStationIdIn(List.copyOf(accessControlService.accessibleStationIds(user))));
    }

    @Override
    public AlertResponse findById(Long id) {
        return AlertMapper.toResponse(findAlertById(id));
    }

    @Override
    public AlertResponse findById(Long id, String currentUserEmail) {
        Alert alert = findAlertById(id);
        accessControlService.ensureStationAccess(accessControlService.findUserByEmail(currentUserEmail), alert.getSensor().getStation().getId());
        return AlertMapper.toResponse(alert);
    }

    @Override
    public List<AlertResponse> findBySensorId(Long sensorId) {
        ensureSensorExists(sensorId);
        return AlertMapper.toResponseList(alertRepository.findBySensorId(sensorId));
    }

    @Override
    public List<AlertResponse> findBySensorId(Long sensorId, String currentUserEmail) {
        ensureSensorExists(sensorId);
        Long stationId = sensorRepository.findById(sensorId).orElseThrow().getStation().getId();
        accessControlService.ensureStationAccess(accessControlService.findUserByEmail(currentUserEmail), stationId);
        return AlertMapper.toResponseList(alertRepository.findBySensorId(sensorId));
    }

    @Override
    @Transactional
    public AlertResponse create(AlertRequest request) {
        ensureSensorExists(request.sensorId());

        Alert alert = AlertMapper.toEntity(request);
        return AlertMapper.toResponse(alertRepository.save(alert));
    }

    @Override
    @Transactional
    public AlertResponse update(Long id, AlertRequest request) {
        Alert alert = findAlertById(id);
        ensureSensorExists(request.sensorId());

        Alert updatedAlert = AlertMapper.toEntity(request);
        alert.setSensor(updatedAlert.getSensor());
        alert.setAlertType(updatedAlert.getAlertType());
        alert.setSeverity(updatedAlert.getSeverity());
        alert.setMessage(updatedAlert.getMessage());
        alert.setStatus(updatedAlert.getStatus());
        alert.setTriggeredAt(updatedAlert.getTriggeredAt());
        alert.setResolvedAt(updatedAlert.getResolvedAt());

        return AlertMapper.toResponse(alertRepository.save(alert));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Alert alert = findAlertById(id);
        alertRepository.delete(alert);
    }

    private Alert findAlertById(Long id) {
        return alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found with id: " + id));
    }

    private void ensureSensorExists(Long sensorId) {
        if (!sensorRepository.existsById(sensorId)) {
            throw new ResourceNotFoundException("Sensor not found with id: " + sensorId);
        }
    }
}
