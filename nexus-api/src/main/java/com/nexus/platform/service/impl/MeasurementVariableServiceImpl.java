package com.nexus.platform.service.impl;

import com.nexus.domain.entity.AppUser;
import com.nexus.domain.entity.MeasurementVariable;
import com.nexus.platform.dto.measurementvariable.MeasurementVariableRequest;
import com.nexus.platform.dto.measurementvariable.MeasurementVariableResponse;
import com.nexus.platform.exception.ResourceNotFoundException;
import com.nexus.platform.mapper.MeasurementVariableMapper;
import com.nexus.platform.repository.MeasurementVariableRepository;
import com.nexus.platform.repository.StationRepository;
import com.nexus.platform.service.AccessControlService;
import com.nexus.platform.service.MeasurementVariableService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class MeasurementVariableServiceImpl implements MeasurementVariableService {

    private final MeasurementVariableRepository measurementVariableRepository;
    private final StationRepository stationRepository;
    private final AccessControlService accessControlService;

    public MeasurementVariableServiceImpl(
            MeasurementVariableRepository measurementVariableRepository,
            StationRepository stationRepository,
            AccessControlService accessControlService
    ) {
        this.measurementVariableRepository = measurementVariableRepository;
        this.stationRepository = stationRepository;
        this.accessControlService = accessControlService;
    }

    @Override
    public List<MeasurementVariableResponse> findAll() {
        return MeasurementVariableMapper.toResponseList(measurementVariableRepository.findAll());
    }

    @Override
    public List<MeasurementVariableResponse> findAll(String currentUserEmail) {
        AppUser user = accessControlService.findUserByEmail(currentUserEmail);
        if (accessControlService.hasUnrestrictedAccess(user)) {
            return findAll();
        }
        return MeasurementVariableMapper.toResponseList(
                measurementVariableRepository.findByStationIdIn(List.copyOf(accessControlService.accessibleStationIds(user)))
        );
    }

    @Override
    public MeasurementVariableResponse findById(Long id) {
        return MeasurementVariableMapper.toResponse(findMeasurementVariableById(id));
    }

    @Override
    public MeasurementVariableResponse findById(Long id, String currentUserEmail) {
        MeasurementVariable variable = findMeasurementVariableById(id);
        accessControlService.ensureStationAccess(accessControlService.findUserByEmail(currentUserEmail), variable.getStation().getId());
        return MeasurementVariableMapper.toResponse(variable);
    }

    @Override
    public List<MeasurementVariableResponse> findByStationId(Long stationId) {
        ensureStationExists(stationId);
        return MeasurementVariableMapper.toResponseList(measurementVariableRepository.findByStationId(stationId));
    }

    @Override
    public List<MeasurementVariableResponse> findByStationId(Long stationId, String currentUserEmail) {
        accessControlService.ensureStationAccess(accessControlService.findUserByEmail(currentUserEmail), stationId);
        return findByStationId(stationId);
    }

    @Override
    @Transactional
    public MeasurementVariableResponse update(Long id, MeasurementVariableRequest request) {
        MeasurementVariable variable = findMeasurementVariableById(id);
        variable.setDisplayName(request.displayName());
        variable.setDescription(request.description());
        variable.setUnit(request.unit());
        if (request.active() != null) {
            variable.setActive(request.active());
        }
        variable.setUpdatedAt(Instant.now());

        return MeasurementVariableMapper.toResponse(measurementVariableRepository.save(variable));
    }

    private MeasurementVariable findMeasurementVariableById(Long id) {
        return measurementVariableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Measurement variable not found with id: " + id));
    }

    private void ensureStationExists(Long stationId) {
        if (!stationRepository.existsById(stationId)) {
            throw new ResourceNotFoundException("Station not found with id: " + stationId);
        }
    }
}
