package com.nexus.platform.service.impl;

import com.nexus.domain.entity.Farm;
import com.nexus.domain.entity.Station;
import com.nexus.platform.dto.station.StationRequest;
import com.nexus.platform.dto.station.StationResponse;
import com.nexus.platform.exception.DuplicateResourceException;
import com.nexus.platform.exception.ResourceNotFoundException;
import com.nexus.platform.mapper.StationMapper;
import com.nexus.platform.repository.FarmRepository;
import com.nexus.platform.repository.StationRepository;
import com.nexus.platform.service.StationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class StationServiceImpl implements StationService {

    private final StationRepository stationRepository;
    private final FarmRepository farmRepository;

    public StationServiceImpl(StationRepository stationRepository, FarmRepository farmRepository) {
        this.stationRepository = stationRepository;
        this.farmRepository = farmRepository;
    }

    @Override
    public List<StationResponse> findAll() {
        return StationMapper.toResponseList(stationRepository.findAll());
    }

    @Override
    public StationResponse findById(Long id) {
        return StationMapper.toResponse(findStationById(id));
    }

    @Override
    public List<StationResponse> findByFarmId(Long farmId) {
        ensureFarmExists(farmId);
        return StationMapper.toResponseList(stationRepository.findByFarmId(farmId));
    }

    @Override
    @Transactional
    public StationResponse create(StationRequest request) {
        Farm farm = farmRepository.findById(request.farmId())
                .orElseThrow(() -> new ResourceNotFoundException("Farm not found with id: " + request.farmId()));
        ensureStationCodeIsAvailable(request.code());

        Station station = StationMapper.toEntity(request);
        station.setFarm(farm);
        station.setCreatedAt(Instant.now());
        return StationMapper.toResponse(stationRepository.save(station));
    }

    @Override
    @Transactional
    public StationResponse update(Long id, StationRequest request) {
        Station station = findStationById(id);
        ensureFarmExists(request.farmId());
        ensureStationCodeIsAvailableForUpdate(request.code(), id);

        Station updatedStation = StationMapper.toEntity(request);
        station.setFarm(updatedStation.getFarm());
        station.setName(updatedStation.getName());
        station.setCode(updatedStation.getCode());
        station.setLatitude(updatedStation.getLatitude());
        station.setLongitude(updatedStation.getLongitude());
        station.setAltitude(updatedStation.getAltitude());
        station.setStatus(updatedStation.getStatus());
        station.setUpdatedAt(Instant.now());

        return StationMapper.toResponse(stationRepository.save(station));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Station station = findStationById(id);
        stationRepository.delete(station);
    }

    private Station findStationById(Long id) {
        return stationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Station not found with id: " + id));
    }

    private void ensureFarmExists(Long farmId) {
        if (!farmRepository.existsById(farmId)) {
            throw new ResourceNotFoundException("Farm not found with id: " + farmId);
        }
    }

    private void ensureStationCodeIsAvailable(String code) {
        if (stationRepository.existsByCode(code)) {
            throw new DuplicateResourceException("Station already exists with code: " + code);
        }
    }

    private void ensureStationCodeIsAvailableForUpdate(String code, Long stationId) {
        stationRepository.findByCode(code)
                .filter(existingStation -> !existingStation.getId().equals(stationId))
                .ifPresent(existingStation -> {
                    throw new DuplicateResourceException("Station already exists with code: " + code);
                });
    }
}
