package com.nexus.platform.service.impl;

import com.nexus.domain.entity.AppUser;
import com.nexus.domain.entity.Measurement;
import com.nexus.domain.entity.MeasurementId;
import com.nexus.domain.entity.MeasurementVariable;
import com.nexus.platform.dto.measurement.MeasurementRequest;
import com.nexus.platform.dto.measurement.MeasurementResponse;
import com.nexus.platform.exception.DuplicateResourceException;
import com.nexus.platform.exception.ResourceNotFoundException;
import com.nexus.platform.mapper.MeasurementMapper;
import com.nexus.platform.repository.MeasurementRepository;
import com.nexus.platform.repository.MeasurementVariableRepository;
import com.nexus.platform.service.AccessControlService;
import com.nexus.platform.service.MeasurementService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class MeasurementServiceImpl implements MeasurementService {

    private final MeasurementRepository measurementRepository;
    private final MeasurementVariableRepository measurementVariableRepository;
    private final AccessControlService accessControlService;

    public MeasurementServiceImpl(
            MeasurementRepository measurementRepository,
            MeasurementVariableRepository measurementVariableRepository,
            AccessControlService accessControlService
    ) {
        this.measurementRepository = measurementRepository;
        this.measurementVariableRepository = measurementVariableRepository;
        this.accessControlService = accessControlService;
    }

    @Override
    public List<MeasurementResponse> findAll() {
        return MeasurementMapper.toResponseList(measurementRepository.findAll());
    }

    @Override
    public List<MeasurementResponse> findAll(String currentUserEmail) {
        AppUser user = accessControlService.findUserByEmail(currentUserEmail);
        if (accessControlService.hasUnrestrictedAccess(user)) {
            return findAll();
        }
        return MeasurementMapper.toResponseList(
                measurementRepository.findByMeasurementVariableStationIdInOrderByIdMeasuredAtDesc(List.copyOf(accessControlService.accessibleStationIds(user)))
                        .stream()
                        .filter(measurement -> accessControlService.canAccessMeasurementVariable(user, measurement.getMeasurementVariable()))
                        .toList()
        );
    }

    @Override
    public MeasurementResponse findById(Instant time, Long variableId) {
        return MeasurementMapper.toResponse(findMeasurementById(time, variableId));
    }

    @Override
    public MeasurementResponse findById(Instant time, Long variableId, String currentUserEmail) {
        ensureVariableAccess(variableId, currentUserEmail);
        return findById(time, variableId);
    }

    @Override
    public List<MeasurementResponse> findByVariableId(Long variableId) {
        ensureVariableExists(variableId);
        return MeasurementMapper.toResponseList(measurementRepository.findByMeasurementVariableIdOrderByIdMeasuredAtDesc(variableId));
    }

    @Override
    public List<MeasurementResponse> findByVariableId(Long variableId, String currentUserEmail, List<String> measurementTypes) {
        ensureVariableAccess(variableId, currentUserEmail);
        ensureMeasurementTypeAccess(currentUserEmail, measurementTypes);
        return findByVariableId(variableId);
    }

    @Override
    public List<MeasurementResponse> findByVariableIdAndTimeBetween(Long variableId, Instant start, Instant end) {
        ensureVariableExists(variableId);
        return MeasurementMapper.toResponseList(
                measurementRepository.findByMeasurementVariableIdAndIdMeasuredAtBetweenOrderByIdMeasuredAtAsc(variableId, start, end)
        );
    }

    @Override
    public List<MeasurementResponse> findByVariableIdAndTimeBetween(
            Long variableId,
            Instant start,
            Instant end,
            String currentUserEmail,
            List<String> measurementTypes
    ) {
        ensureVariableAccess(variableId, currentUserEmail);
        ensureMeasurementTypeAccess(currentUserEmail, measurementTypes);
        return findByVariableIdAndTimeBetween(variableId, start, end);
    }

    @Override
    public List<MeasurementResponse> findByStationIdAndVariablesAndTimeBetween(
            Long stationId,
            List<Long> variableIds,
            Instant start,
            Instant end,
            String currentUserEmail
    ) {
        AppUser user = accessControlService.findUserByEmail(currentUserEmail);
        accessControlService.ensureStationAccess(user, stationId);

        List<MeasurementVariable> variables = findRequestedVariables(stationId, variableIds);
        List<Long> accessibleVariableIds = variables.stream()
                .filter(variable -> accessControlService.canAccessMeasurementVariable(user, variable))
                .map(MeasurementVariable::getId)
                .toList();

        if (variableIds != null && !variableIds.isEmpty() && accessibleVariableIds.size() != variables.size()) {
            throw new org.springframework.security.access.AccessDeniedException("You do not have permission to access one or more measurement variables");
        }

        if (accessibleVariableIds.isEmpty()) {
            return List.of();
        }

        return MeasurementMapper.toResponseList(
                measurementRepository.findByMeasurementVariableStationIdAndMeasurementVariableIdInAndIdMeasuredAtBetweenOrderByIdMeasuredAtAsc(
                        stationId,
                        accessibleVariableIds,
                        start,
                        end
                )
        );
    }

    @Override
    @Transactional
    public MeasurementResponse create(MeasurementRequest request) {
        ensureVariableExists(request.variableId());

        MeasurementId id = new MeasurementId(request.measuredAt(), request.variableId());
        if (measurementRepository.existsById(id)) {
            throw new DuplicateResourceException("Measurement already exists for variable id "
                    + request.variableId() + " at time " + request.measuredAt());
        }

        Measurement measurement = MeasurementMapper.toEntity(request);
        measurement.setCreatedAt(Instant.now());
        return MeasurementMapper.toResponse(measurementRepository.save(measurement));
    }

    @Override
    @Transactional
    public MeasurementResponse update(Instant time, Long variableId, MeasurementRequest request) {
        Measurement measurement = findMeasurementById(time, variableId);
        ensureVariableExists(request.variableId());

        MeasurementId requestedId = new MeasurementId(request.measuredAt(), request.variableId());
        if (!requestedId.equals(measurement.getId()) && measurementRepository.existsById(requestedId)) {
            throw new DuplicateResourceException("Measurement already exists for variable id "
                    + request.variableId() + " at time " + request.measuredAt());
        }

        Measurement updatedMeasurement = MeasurementMapper.toEntity(request);
        measurement.setId(updatedMeasurement.getId());
        measurement.setMeasurementVariable(updatedMeasurement.getMeasurementVariable());
        measurement.setNumericValue(updatedMeasurement.getNumericValue());
        measurement.setTextValue(updatedMeasurement.getTextValue());
        measurement.setQuality(updatedMeasurement.getQuality());

        return MeasurementMapper.toResponse(measurementRepository.save(measurement));
    }

    @Override
    @Transactional
    public void delete(Instant time, Long variableId) {
        Measurement measurement = findMeasurementById(time, variableId);
        measurementRepository.delete(measurement);
    }

    private Measurement findMeasurementById(Instant time, Long variableId) {
        MeasurementId id = new MeasurementId(time, variableId);
        return measurementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Measurement not found for variable id "
                        + variableId + " at time " + time));
    }

    private void ensureVariableExists(Long variableId) {
        if (!measurementVariableRepository.existsById(variableId)) {
            throw new ResourceNotFoundException("Measurement variable not found with id: " + variableId);
        }
    }

    private void ensureVariableAccess(Long variableId, String currentUserEmail) {
        MeasurementVariable variable = measurementVariableRepository.findById(variableId)
                .orElseThrow(() -> new ResourceNotFoundException("Measurement variable not found with id: " + variableId));
        accessControlService.ensureMeasurementVariableAccess(accessControlService.findUserByEmail(currentUserEmail), variable);
    }

    private void ensureMeasurementTypeAccess(String currentUserEmail, List<String> measurementTypes) {
        if (measurementTypes == null || measurementTypes.isEmpty()) {
            return;
        }

        AppUser user = accessControlService.findUserByEmail(currentUserEmail);
        measurementTypes.forEach(type -> accessControlService.ensureMeasurementTypeAccess(user, type));
    }

    private List<MeasurementVariable> findRequestedVariables(Long stationId, List<Long> variableIds) {
        if (variableIds == null || variableIds.isEmpty()) {
            return measurementVariableRepository.findByStationId(stationId);
        }

        List<MeasurementVariable> variables = measurementVariableRepository.findByStationIdAndIdIn(stationId, variableIds);
        if (variables.size() != variableIds.stream().distinct().count()) {
            throw new ResourceNotFoundException("One or more measurement variables were not found for station id: " + stationId);
        }
        return variables;
    }
}
