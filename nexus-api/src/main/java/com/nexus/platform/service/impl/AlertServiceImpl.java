package com.nexus.platform.service.impl;

import com.nexus.domain.entity.AppUser;
import com.nexus.domain.entity.Alert;
import com.nexus.domain.entity.MeasurementVariable;
import com.nexus.platform.dto.alert.AlertRequest;
import com.nexus.platform.dto.alert.AlertResponse;
import com.nexus.platform.exception.ResourceNotFoundException;
import com.nexus.platform.mapper.AlertMapper;
import com.nexus.platform.repository.AlertRepository;
import com.nexus.platform.repository.MeasurementVariableRepository;
import com.nexus.platform.service.AccessControlService;
import com.nexus.platform.service.AlertService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class AlertServiceImpl implements AlertService {

    private final AlertRepository alertRepository;
    private final MeasurementVariableRepository measurementVariableRepository;
    private final AccessControlService accessControlService;

    public AlertServiceImpl(
            AlertRepository alertRepository,
            MeasurementVariableRepository measurementVariableRepository,
            AccessControlService accessControlService
    ) {
        this.alertRepository = alertRepository;
        this.measurementVariableRepository = measurementVariableRepository;
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
        return AlertMapper.toResponseList(alertRepository.findByMeasurementVariableStationIdIn(List.copyOf(accessControlService.accessibleStationIds(user))));
    }

    @Override
    public AlertResponse findById(Long id) {
        return AlertMapper.toResponse(findAlertById(id));
    }

    @Override
    public AlertResponse findById(Long id, String currentUserEmail) {
        Alert alert = findAlertById(id);
        accessControlService.ensureStationAccess(
                accessControlService.findUserByEmail(currentUserEmail),
                alert.getMeasurementVariable().getStation().getId()
        );
        return AlertMapper.toResponse(alert);
    }

    @Override
    public List<AlertResponse> findByVariableId(Long variableId) {
        ensureVariableExists(variableId);
        return AlertMapper.toResponseList(alertRepository.findByMeasurementVariableId(variableId));
    }

    @Override
    public List<AlertResponse> findByVariableId(Long variableId, String currentUserEmail) {
        MeasurementVariable variable = findVariableById(variableId);
        Long stationId = variable.getStation().getId();
        accessControlService.ensureStationAccess(accessControlService.findUserByEmail(currentUserEmail), stationId);
        return AlertMapper.toResponseList(alertRepository.findByMeasurementVariableId(variableId));
    }

    @Override
    @Transactional
    public AlertResponse create(AlertRequest request) {
        ensureVariableExists(resolveVariableId(request));

        Alert alert = AlertMapper.toEntity(request);
        return AlertMapper.toResponse(alertRepository.save(alert));
    }

    @Override
    @Transactional
    public AlertResponse update(Long id, AlertRequest request) {
        Alert alert = findAlertById(id);
        ensureVariableExists(resolveVariableId(request));

        Alert updatedAlert = AlertMapper.toEntity(request);
        alert.setMeasurementVariable(updatedAlert.getMeasurementVariable());
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

    private void ensureVariableExists(Long variableId) {
        findVariableById(variableId);
    }

    private MeasurementVariable findVariableById(Long variableId) {
        if (variableId == null) {
            throw new IllegalArgumentException("Measurement variable id is required");
        }
        return measurementVariableRepository.findById(variableId)
                .orElseThrow(() -> new ResourceNotFoundException("Measurement variable not found with id: " + variableId));
    }

    private Long resolveVariableId(AlertRequest request) {
        return request.variableId() != null ? request.variableId() : request.sensorId();
    }
}
