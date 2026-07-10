package com.nexus.platform.service.impl;

import com.nexus.domain.entity.AppUser;
import com.nexus.domain.entity.Sensor;
import com.nexus.platform.dto.sensor.SensorRequest;
import com.nexus.platform.dto.sensor.SensorResponse;
import com.nexus.platform.exception.DuplicateResourceException;
import com.nexus.platform.exception.ResourceNotFoundException;
import com.nexus.platform.mapper.SensorMapper;
import com.nexus.platform.repository.SensorRepository;
import com.nexus.platform.repository.StationRepository;
import com.nexus.platform.service.AccessControlService;
import com.nexus.platform.service.SensorService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class SensorServiceImpl implements SensorService {

    private final SensorRepository sensorRepository;
    private final StationRepository stationRepository;
    private final AccessControlService accessControlService;

    public SensorServiceImpl(
            SensorRepository sensorRepository,
            StationRepository stationRepository,
            AccessControlService accessControlService
    ) {
        this.sensorRepository = sensorRepository;
        this.stationRepository = stationRepository;
        this.accessControlService = accessControlService;
    }

    @Override
    public List<SensorResponse> findAll() {
        return SensorMapper.toResponseList(sensorRepository.findAll());
    }

    @Override
    public List<SensorResponse> findAll(String currentUserEmail) {
        AppUser user = accessControlService.findUserByEmail(currentUserEmail);
        if (accessControlService.hasUnrestrictedAccess(user)) {
            return findAll();
        }
        return SensorMapper.toResponseList(sensorRepository.findByStationIdIn(List.copyOf(accessControlService.accessibleStationIds(user))));
    }

    @Override
    public SensorResponse findById(Long id) {
        return SensorMapper.toResponse(findSensorById(id));
    }

    @Override
    public SensorResponse findById(Long id, String currentUserEmail) {
        Sensor sensor = findSensorById(id);
        accessControlService.ensureStationAccess(accessControlService.findUserByEmail(currentUserEmail), sensor.getStation().getId());
        return SensorMapper.toResponse(sensor);
    }

    @Override
    public List<SensorResponse> findByStationId(Long stationId) {
        ensureStationExists(stationId);
        return SensorMapper.toResponseList(sensorRepository.findByStationId(stationId));
    }

    @Override
    public List<SensorResponse> findByStationId(Long stationId, String currentUserEmail) {
        accessControlService.ensureStationAccess(accessControlService.findUserByEmail(currentUserEmail), stationId);
        return findByStationId(stationId);
    }

    @Override
    @Transactional
    public SensorResponse create(SensorRequest request) {
        ensureStationExists(request.stationId());
        ensureSensorCodeIsAvailable(request.code());

        Sensor sensor = SensorMapper.toEntity(request);
        sensor.setCreatedAt(Instant.now());
        return SensorMapper.toResponse(sensorRepository.save(sensor));
    }

    @Override
    @Transactional
    public SensorResponse update(Long id, SensorRequest request) {
        Sensor sensor = findSensorById(id);
        ensureStationExists(request.stationId());
        ensureSensorCodeIsAvailableForUpdate(request.code(), id);

        Sensor updatedSensor = SensorMapper.toEntity(request);
        sensor.setStation(updatedSensor.getStation());
        sensor.setCode(updatedSensor.getCode());
        sensor.setName(updatedSensor.getName());
        sensor.setSensorType(updatedSensor.getSensorType());
        sensor.setUnit(updatedSensor.getUnit());
        sensor.setDepthCm(updatedSensor.getDepthCm());
        sensor.setStatus(updatedSensor.getStatus());
        sensor.setMetadata(updatedSensor.getMetadata());
        sensor.setUpdatedAt(Instant.now());

        return SensorMapper.toResponse(sensorRepository.save(sensor));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Sensor sensor = findSensorById(id);
        sensorRepository.delete(sensor);
    }

    private Sensor findSensorById(Long id) {
        return sensorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sensor not found with id: " + id));
    }

    private void ensureStationExists(Long stationId) {
        if (!stationRepository.existsById(stationId)) {
            throw new ResourceNotFoundException("Station not found with id: " + stationId);
        }
    }

    private void ensureSensorCodeIsAvailable(String code) {
        if (sensorRepository.existsByCode(code)) {
            throw new DuplicateResourceException("Sensor already exists with code: " + code);
        }
    }

    private void ensureSensorCodeIsAvailableForUpdate(String code, Long sensorId) {
        sensorRepository.findByCode(code)
                .filter(existingSensor -> !existingSensor.getId().equals(sensorId))
                .ifPresent(existingSensor -> {
                    throw new DuplicateResourceException("Sensor already exists with code: " + code);
                });
    }
}
