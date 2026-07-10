package com.nexus.platform.service;

import com.nexus.platform.dto.farm.FarmRequest;
import com.nexus.platform.dto.farm.FarmResponse;

import java.util.List;

public interface FarmService {

    List<FarmResponse> findAll();

    List<FarmResponse> findAll(String currentUserEmail);

    FarmResponse findById(Long id);

    FarmResponse findById(Long id, String currentUserEmail);

    FarmResponse create(FarmRequest request);

    FarmResponse update(Long id, FarmRequest request);

    void delete(Long id);
}
