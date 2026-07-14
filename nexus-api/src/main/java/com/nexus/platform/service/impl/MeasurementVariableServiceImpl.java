package com.nexus.platform.service.impl;

import com.nexus.domain.entity.AppUser;
import com.nexus.domain.entity.MeasurementVariable;
import com.nexus.domain.enums.Role;
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
        return search(null, null, null, currentUserEmail);
    }

    @Override
    public List<MeasurementVariableResponse> search(Long stationId, Boolean active, String search, String currentUserEmail) {
        AppUser user = accessControlService.findUserByEmail(currentUserEmail);
        if (accessControlService.hasUnrestrictedAccess(user)) {
            return MeasurementVariableMapper.toResponseList(
                    measurementVariableRepository.search(stationId, active, normalizeSearch(search))
            );
        }

        if (stationId != null) {
            accessControlService.ensureStationAccess(user, stationId);
            return MeasurementVariableMapper.toResponseList(
                    measurementVariableRepository.search(stationId, active, normalizeSearch(search))
                            .stream()
                            .filter(variable -> accessControlService.canAccessMeasurementVariable(user, variable))
                            .toList()
            );
        }

        List<Long> stationIds = List.copyOf(accessControlService.accessibleStationIds(user));
        if (stationIds.isEmpty()) {
            return List.of();
        }

        return MeasurementVariableMapper.toResponseList(
                measurementVariableRepository.searchByStationIds(stationIds, active, normalizeSearch(search))
                        .stream()
                        .filter(variable -> accessControlService.canAccessMeasurementVariable(user, variable))
                        .toList()
        );
    }

    @Override
    public MeasurementVariableResponse findById(Long id) {
        return MeasurementVariableMapper.toResponse(findMeasurementVariableById(id));
    }

    @Override
    public MeasurementVariableResponse findById(Long id, String currentUserEmail) {
        MeasurementVariable variable = findMeasurementVariableById(id);
        accessControlService.ensureMeasurementVariableAccess(accessControlService.findUserByEmail(currentUserEmail), variable);
        return MeasurementVariableMapper.toResponse(variable);
    }

    @Override
    public List<MeasurementVariableResponse> findByStationId(Long stationId) {
        ensureStationExists(stationId);
        return MeasurementVariableMapper.toResponseList(measurementVariableRepository.findByStationId(stationId));
    }

    @Override
    public List<MeasurementVariableResponse> findByStationId(Long stationId, String currentUserEmail) {
        AppUser user = accessControlService.findUserByEmail(currentUserEmail);
        accessControlService.ensureStationAccess(user, stationId);
        return MeasurementVariableMapper.toResponseList(
                measurementVariableRepository.findByStationId(stationId)
                        .stream()
                        .filter(variable -> accessControlService.canAccessMeasurementVariable(user, variable))
                        .toList()
        );
    }

    @Override
    @Transactional
    public MeasurementVariableResponse update(Long id, MeasurementVariableRequest request, String currentUserEmail) {
        MeasurementVariable variable = findMeasurementVariableById(id);
        AppUser user = accessControlService.findUserByEmail(currentUserEmail);
        ensureCanUpdateVariable(user, variable);
        variable.setDisplayName(request.displayName());
        variable.setDescription(request.description());
        variable.setUnit(request.unit());
        if (request.active() != null) {
            variable.setActive(request.active());
        }
        variable.setMeasurementType(request.measurementType());
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

    private void ensureCanUpdateVariable(AppUser user, MeasurementVariable variable) {
        if (accessControlService.hasUnrestrictedAccess(user)) {
            return;
        }

        if (user.getRole() != Role.ADMIN) {
            throw new org.springframework.security.access.AccessDeniedException("You do not have permission to update measurement variables");
        }

        accessControlService.ensureStationAccess(user, variable.getStation().getId());
    }

    private String normalizeSearch(String search) {
        if (search == null || search.isBlank()) {
            return null;
        }
        return search.trim();
    }
}
