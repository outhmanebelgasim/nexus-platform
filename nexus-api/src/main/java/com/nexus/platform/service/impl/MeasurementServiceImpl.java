package com.nexus.platform.service.impl;

import com.nexus.domain.entity.Measurement;
import com.nexus.domain.entity.MeasurementId;
import com.nexus.platform.dto.measurement.MeasurementRequest;
import com.nexus.platform.dto.measurement.MeasurementResponse;
import com.nexus.platform.exception.DuplicateResourceException;
import com.nexus.platform.exception.ResourceNotFoundException;
import com.nexus.platform.mapper.MeasurementMapper;
import com.nexus.platform.repository.MeasurementRepository;
import com.nexus.platform.repository.SensorRepository;
import com.nexus.platform.service.MeasurementService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class MeasurementServiceImpl implements MeasurementService {

    private final MeasurementRepository measurementRepository;
    private final SensorRepository sensorRepository;

    public MeasurementServiceImpl(MeasurementRepository measurementRepository, SensorRepository sensorRepository) {
        this.measurementRepository = measurementRepository;
        this.sensorRepository = sensorRepository;
    }

    @Override
    public List<MeasurementResponse> findAll() {
        return MeasurementMapper.toResponseList(measurementRepository.findAll());
    }

    @Override
    public MeasurementResponse findById(Instant time, Long sensorId) {
        return MeasurementMapper.toResponse(findMeasurementById(time, sensorId));
    }

    @Override
    public List<MeasurementResponse> findBySensorId(Long sensorId) {
        ensureSensorExists(sensorId);
        return MeasurementMapper.toResponseList(measurementRepository.findBySensorIdOrderByIdTimeDesc(sensorId));
    }

    @Override
    public List<MeasurementResponse> findBySensorIdAndTimeBetween(Long sensorId, Instant start, Instant end) {
        ensureSensorExists(sensorId);
        return MeasurementMapper.toResponseList(
                measurementRepository.findBySensorIdAndIdTimeBetweenOrderByIdTimeAsc(sensorId, start, end)
        );
    }

    @Override
    @Transactional
    public MeasurementResponse create(MeasurementRequest request) {
        ensureSensorExists(request.sensorId());

        MeasurementId id = new MeasurementId(request.time(), request.sensorId());
        if (measurementRepository.existsById(id)) {
            throw new DuplicateResourceException("Measurement already exists for sensor id "
                    + request.sensorId() + " at time " + request.time());
        }

        Measurement measurement = MeasurementMapper.toEntity(request);
        measurement.setCreatedAt(Instant.now());
        return MeasurementMapper.toResponse(measurementRepository.save(measurement));
    }

    @Override
    @Transactional
    public MeasurementResponse update(Instant time, Long sensorId, MeasurementRequest request) {
        Measurement measurement = findMeasurementById(time, sensorId);
        ensureSensorExists(request.sensorId());

        MeasurementId requestedId = new MeasurementId(request.time(), request.sensorId());
        if (!requestedId.equals(measurement.getId()) && measurementRepository.existsById(requestedId)) {
            throw new DuplicateResourceException("Measurement already exists for sensor id "
                    + request.sensorId() + " at time " + request.time());
        }

        Measurement updatedMeasurement = MeasurementMapper.toEntity(request);
        measurement.setId(updatedMeasurement.getId());
        measurement.setSensor(updatedMeasurement.getSensor());
        measurement.setValue(updatedMeasurement.getValue());
        measurement.setQuality(updatedMeasurement.getQuality());

        return MeasurementMapper.toResponse(measurementRepository.save(measurement));
    }

    @Override
    @Transactional
    public void delete(Instant time, Long sensorId) {
        Measurement measurement = findMeasurementById(time, sensorId);
        measurementRepository.delete(measurement);
    }

    private Measurement findMeasurementById(Instant time, Long sensorId) {
        MeasurementId id = new MeasurementId(time, sensorId);
        return measurementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Measurement not found for sensor id "
                        + sensorId + " at time " + time));
    }

    private void ensureSensorExists(Long sensorId) {
        if (!sensorRepository.existsById(sensorId)) {
            throw new ResourceNotFoundException("Sensor not found with id: " + sensorId);
        }
    }
}
