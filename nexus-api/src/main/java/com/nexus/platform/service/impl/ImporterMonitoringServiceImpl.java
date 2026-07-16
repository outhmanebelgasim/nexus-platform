package com.nexus.platform.service.impl;

import com.nexus.domain.entity.ImportLog;
import com.nexus.domain.enums.ImportStatus;
import com.nexus.platform.dto.importer.ImporterFileResponse;
import com.nexus.platform.dto.importer.ImporterLogPageResponse;
import com.nexus.platform.dto.importer.ImporterLogResponse;
import com.nexus.platform.dto.importer.ImporterStatusResponse;
import com.nexus.platform.model.ImportFileStateView;
import com.nexus.platform.repository.ImportFileStateViewRepository;
import com.nexus.platform.repository.ImportLogRepository;
import com.nexus.platform.repository.MeasurementRepository;
import com.nexus.platform.repository.MeasurementVariableRepository;
import com.nexus.platform.repository.StationRepository;
import com.nexus.platform.service.ImporterMonitoringService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class ImporterMonitoringServiceImpl implements ImporterMonitoringService {

    private final ImportLogRepository importLogRepository;
    private final ImportFileStateViewRepository importFileStateViewRepository;
    private final StationRepository stationRepository;
    private final MeasurementVariableRepository measurementVariableRepository;
    private final MeasurementRepository measurementRepository;

    public ImporterMonitoringServiceImpl(
            ImportLogRepository importLogRepository,
            ImportFileStateViewRepository importFileStateViewRepository,
            StationRepository stationRepository,
            MeasurementVariableRepository measurementVariableRepository,
            MeasurementRepository measurementRepository
    ) {
        this.importLogRepository = importLogRepository;
        this.importFileStateViewRepository = importFileStateViewRepository;
        this.stationRepository = stationRepository;
        this.measurementVariableRepository = measurementVariableRepository;
        this.measurementRepository = measurementRepository;
    }

    @Override
    public ImporterStatusResponse getStatus() {
        return new ImporterStatusResponse(
                importLogRepository.findLastFinishedAt(),
                importLogRepository.findLastFinishedAtByStatus(ImportStatus.SUCCESS),
                importLogRepository.findLastFinishedAtByStatus(ImportStatus.FAILED),
                importLogRepository.countByStatus(ImportStatus.SUCCESS),
                importLogRepository.countByStatus(ImportStatus.PARTIAL_SUCCESS),
                importLogRepository.countByStatus(ImportStatus.FAILED),
                importFileStateViewRepository.count(),
                stationRepository.count(),
                measurementVariableRepository.count(),
                measurementRepository.count()
        );
    }

    @Override
    public ImporterLogPageResponse getLogs(
            ImportStatus status,
            String filename,
            Instant start,
            Instant end,
            Pageable pageable
    ) {
        Specification<ImportLog> specification = hasStatus(status)
                .and(fileNameContains(filename))
                .and(startedAtOnOrAfter(start))
                .and(startedAtOnOrBefore(end));

        Page<ImporterLogResponse> logs = importLogRepository.findAll(specification, pageable).map(this::toLogResponse);
        return new ImporterLogPageResponse(
                logs.getContent(),
                logs.getNumber(),
                logs.getSize(),
                logs.getTotalElements(),
                logs.getTotalPages()
        );
    }

    @Override
    public List<ImporterFileResponse> getFiles() {
        return importFileStateViewRepository.findAllByOrderByFileNameAsc().stream()
                .map(this::toFileResponse)
                .toList();
    }

    private Specification<ImportLog> hasStatus(ImportStatus status) {
        return (root, query, criteriaBuilder) -> status == null
                ? criteriaBuilder.conjunction()
                : criteriaBuilder.equal(root.get("status"), status);
    }

    private Specification<ImportLog> fileNameContains(String filename) {
        return (root, query, criteriaBuilder) -> {
            if (filename == null || filename.isBlank()) {
                return criteriaBuilder.conjunction();
            }
            String pattern = "%" + filename.toLowerCase(Locale.ROOT).trim() + "%";
            return criteriaBuilder.like(criteriaBuilder.lower(root.get("fileName")), pattern);
        };
    }

    private Specification<ImportLog> startedAtOnOrAfter(Instant start) {
        return (root, query, criteriaBuilder) -> start == null
                ? criteriaBuilder.conjunction()
                : criteriaBuilder.greaterThanOrEqualTo(root.get("startedAt"), start);
    }

    private Specification<ImportLog> startedAtOnOrBefore(Instant end) {
        return (root, query, criteriaBuilder) -> end == null
                ? criteriaBuilder.conjunction()
                : criteriaBuilder.lessThanOrEqualTo(root.get("startedAt"), end);
    }

    private ImporterLogResponse toLogResponse(ImportLog log) {
        return new ImporterLogResponse(
                log.getId(),
                log.getBatchId(),
                log.getFileName(),
                safeDisplayPath(log.getFilePath(), log.getFileName()),
                log.getStatus(),
                log.getTotalRows(),
                log.getImportedRows(),
                log.getSkippedRows(),
                log.getErrorMessage(),
                log.getStartedAt(),
                log.getFinishedAt()
        );
    }

    private ImporterFileResponse toFileResponse(ImportFileStateView state) {
        return new ImporterFileResponse(
                state.getFileName(),
                safeDisplayPath(state.getFileKey(), state.getFileName()),
                state.getFileSizeBytes(),
                state.getLastModifiedAt(),
                state.getLastProcessedPhysicalLine(),
                state.getLastProcessedTimestamp(),
                state.getLastSuccessfulBatchId(),
                state.getUpdatedAt()
        );
    }

    private String safeDisplayPath(String rawPath, String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return rawPath == null ? null : rawPath.substring(rawPath.lastIndexOf('/') + 1);
        }
        return fileName;
    }
}
