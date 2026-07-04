package com.nexus.platform.service;

import com.nexus.platform.dto.importlog.ImportLogRequest;
import com.nexus.platform.dto.importlog.ImportLogResponse;

import java.util.List;
import java.util.UUID;

public interface ImportLogService {

    List<ImportLogResponse> findAll();

    ImportLogResponse findById(Long id);

    ImportLogResponse findByBatchId(UUID batchId);

    ImportLogResponse create(ImportLogRequest request);

    ImportLogResponse update(Long id, ImportLogRequest request);

    void delete(Long id);
}
