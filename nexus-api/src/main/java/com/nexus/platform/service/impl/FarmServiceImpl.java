package com.nexus.platform.service.impl;

import com.nexus.domain.entity.Farm;
import com.nexus.platform.dto.farm.FarmRequest;
import com.nexus.platform.dto.farm.FarmResponse;
import com.nexus.platform.exception.ResourceNotFoundException;
import com.nexus.platform.mapper.FarmMapper;
import com.nexus.platform.repository.FarmRepository;
import com.nexus.platform.service.FarmService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class FarmServiceImpl implements FarmService {

    private final FarmRepository farmRepository;

    public FarmServiceImpl(FarmRepository farmRepository) {
        this.farmRepository = farmRepository;
    }

    @Override
    public List<FarmResponse> findAll() {
        return FarmMapper.toResponseList(farmRepository.findAll());
    }

    @Override
    public FarmResponse findById(Long id) {
        Farm farm = findFarmById(id);
        return FarmMapper.toResponse(farm);
    }

    @Override
    @Transactional
    public FarmResponse create(FarmRequest request) {
        Farm farm = FarmMapper.toEntity(request);
        farm.setCreatedAt(Instant.now());

        Farm savedFarm = farmRepository.save(farm);
        return FarmMapper.toResponse(savedFarm);
    }

    @Override
    @Transactional
    public FarmResponse update(Long id, FarmRequest request) {
        Farm farm = findFarmById(id);

        farm.setName(request.name());
        farm.setLocation(request.location());
        farm.setDescription(request.description());
        farm.setGoogleMapsUrl(request.googleMapsUrl());
        farm.setUpdatedAt(Instant.now());

        Farm savedFarm = farmRepository.save(farm);
        return FarmMapper.toResponse(savedFarm);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Farm farm = findFarmById(id);
        farmRepository.delete(farm);
    }

    private Farm findFarmById(Long id) {
        return farmRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Farm not found with id: " + id));
    }
}
