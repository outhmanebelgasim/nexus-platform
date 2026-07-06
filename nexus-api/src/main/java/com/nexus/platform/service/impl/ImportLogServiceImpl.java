package com.nexus.platform.service.impl;

import com.nexus.domain.entity.ImportLog;
import com.nexus.platform.dto.importlog.ImportLogRequest;
import com.nexus.platform.dto.importlog.ImportLogResponse;
import com.nexus.platform.exception.DuplicateResourceException;
import com.nexus.platform.exception.ResourceNotFoundException;
import com.nexus.platform.mapper.ImportLogMapper;
import com.nexus.platform.repository.ImportLogRepository;
import com.nexus.platform.service.ImportLogService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class ImportLogServiceImpl implements ImportLogService {

    private final ImportLogRepository importLogRepository;

    public ImportLogServiceImpl(ImportLogRepository importLogRepository) {
        this.importLogRepository = importLogRepository;
    }

    @Override
    public List<ImportLogResponse> findAll() {
        return ImportLogMapper.toResponseList(importLogRepository.findAll());
    }

    @Override
    public ImportLogResponse findById(Long id) {
        return ImportLogMapper.toResponse(findImportLogById(id));
    }

    @Override
    public ImportLogResponse findByBatchId(UUID batchId) {
        return ImportLogMapper.toResponse(importLogRepository.findByBatchId(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Import log not found with batch id: " + batchId)));
    }

    @Override
    @Transactional
    public ImportLogResponse create(ImportLogRequest request) {
        ensureBatchIdIsAvailable(request.batchId());

        ImportLog importLog = ImportLogMapper.toEntity(request);
        importLog.setStartedAt(Instant.now());
        return ImportLogMapper.toResponse(importLogRepository.save(importLog));
    }

    @Override
    @Transactional
    public ImportLogResponse update(Long id, ImportLogRequest request) {
        ImportLog importLog = findImportLogById(id);
        ensureBatchIdIsAvailableForUpdate(request.batchId(), id);

        ImportLog updatedImportLog = ImportLogMapper.toEntity(request);
        importLog.setBatchId(updatedImportLog.getBatchId());
        importLog.setFileName(updatedImportLog.getFileName());
        importLog.setFilePath(updatedImportLog.getFilePath());
        importLog.setStatus(updatedImportLog.getStatus());
        importLog.setTotalRows(updatedImportLog.getTotalRows());
        importLog.setImportedRows(updatedImportLog.getImportedRows());
        importLog.setSkippedRows(updatedImportLog.getSkippedRows());
        importLog.setErrorMessage(updatedImportLog.getErrorMessage());
        importLog.setFinishedAt(Instant.now());

        return ImportLogMapper.toResponse(importLogRepository.save(importLog));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        ImportLog importLog = findImportLogById(id);
        importLogRepository.delete(importLog);
    }

    private ImportLog findImportLogById(Long id) {
        return importLogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Import log not found with id: " + id));
    }

    private void ensureBatchIdIsAvailable(UUID batchId) {
        importLogRepository.findByBatchId(batchId).ifPresent(importLog -> {
            throw new DuplicateResourceException("Import log already exists with batch id: " + batchId);
        });
    }

    private void ensureBatchIdIsAvailableForUpdate(UUID batchId, Long importLogId) {
        importLogRepository.findByBatchId(batchId)
                .filter(existingImportLog -> !existingImportLog.getId().equals(importLogId))
                .ifPresent(existingImportLog -> {
                    throw new DuplicateResourceException("Import log already exists with batch id: " + batchId);
                });
    }
}
