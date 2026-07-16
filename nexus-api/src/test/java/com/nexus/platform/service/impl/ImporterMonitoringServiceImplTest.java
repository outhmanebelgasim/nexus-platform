package com.nexus.platform.service.impl;

import com.nexus.domain.entity.ImportLog;
import com.nexus.domain.enums.ImportStatus;
import com.nexus.platform.dto.importer.ImporterFileResponse;
import com.nexus.platform.dto.importer.ImporterStatusResponse;
import com.nexus.platform.model.ImportFileStateView;
import com.nexus.platform.repository.ImportFileStateViewRepository;
import com.nexus.platform.repository.ImportLogRepository;
import com.nexus.platform.repository.MeasurementRepository;
import com.nexus.platform.repository.MeasurementVariableRepository;
import com.nexus.platform.repository.StationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ImporterMonitoringServiceImplTest {

    private final ImportLogRepository importLogRepository = mock(ImportLogRepository.class);
    private final ImportFileStateViewRepository importFileStateViewRepository = mock(ImportFileStateViewRepository.class);
    private final StationRepository stationRepository = mock(StationRepository.class);
    private final MeasurementVariableRepository measurementVariableRepository = mock(MeasurementVariableRepository.class);
    private final MeasurementRepository measurementRepository = mock(MeasurementRepository.class);

    private final ImporterMonitoringServiceImpl service = new ImporterMonitoringServiceImpl(
            importLogRepository,
            importFileStateViewRepository,
            stationRepository,
            measurementVariableRepository,
            measurementRepository
    );

    @Test
    void statusUsesAggregateCountsAndTimestamps() {
        Instant lastExecution = Instant.parse("2026-07-16T10:00:00Z");
        Instant lastSuccess = Instant.parse("2026-07-16T09:00:00Z");
        Instant lastFailure = Instant.parse("2026-07-16T08:00:00Z");
        when(importLogRepository.findLastFinishedAt()).thenReturn(lastExecution);
        when(importLogRepository.findLastFinishedAtByStatus(ImportStatus.SUCCESS)).thenReturn(lastSuccess);
        when(importLogRepository.findLastFinishedAtByStatus(ImportStatus.FAILED)).thenReturn(lastFailure);
        when(importLogRepository.countByStatus(ImportStatus.SUCCESS)).thenReturn(4L);
        when(importLogRepository.countByStatus(ImportStatus.PARTIAL_SUCCESS)).thenReturn(2L);
        when(importLogRepository.countByStatus(ImportStatus.FAILED)).thenReturn(1L);
        when(importFileStateViewRepository.count()).thenReturn(6L);
        when(stationRepository.count()).thenReturn(7L);
        when(measurementVariableRepository.count()).thenReturn(55L);
        when(measurementRepository.count()).thenReturn(153144L);

        ImporterStatusResponse response = service.getStatus();

        assertThat(response.lastExecution()).isEqualTo(lastExecution);
        assertThat(response.lastSuccess()).isEqualTo(lastSuccess);
        assertThat(response.lastFailure()).isEqualTo(lastFailure);
        assertThat(response.successCount()).isEqualTo(4L);
        assertThat(response.partialSuccessCount()).isEqualTo(2L);
        assertThat(response.failedCount()).isEqualTo(1L);
        assertThat(response.trackedFileCount()).isEqualTo(6L);
        assertThat(response.stationCount()).isEqualTo(7L);
        assertThat(response.variableCount()).isEqualTo(55L);
        assertThat(response.measurementCount()).isEqualTo(153144L);
    }

    @Test
    void emptyDatabaseReturnsZeroCountsAndNullTimestamps() {
        ImporterStatusResponse response = service.getStatus();

        assertThat(response.lastExecution()).isNull();
        assertThat(response.lastSuccess()).isNull();
        assertThat(response.lastFailure()).isNull();
        assertThat(response.successCount()).isZero();
        assertThat(response.partialSuccessCount()).isZero();
        assertThat(response.failedCount()).isZero();
        assertThat(response.trackedFileCount()).isZero();
        assertThat(response.stationCount()).isZero();
        assertThat(response.variableCount()).isZero();
        assertThat(response.measurementCount()).isZero();
    }

    @Test
    void logsUsePaginatedFilteredRepositoryQueryAndSafeDisplayPath() {
        PageRequest pageable = PageRequest.of(0, 10);
        ImportLog log = ImportLog.builder()
                .id(10L)
                .batchId(UUID.randomUUID())
                .fileName("MTO_Yazid.dat")
                .filePath("/private/input/MTO_Yazid.dat")
                .status(ImportStatus.SUCCESS)
                .totalRows(100)
                .importedRows(90)
                .skippedRows(10)
                .startedAt(Instant.parse("2026-07-16T08:00:00Z"))
                .finishedAt(Instant.parse("2026-07-16T08:01:00Z"))
                .build();
        when(importLogRepository.findAll(any(Specification.class), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(log), pageable, 1));

        var response = service.getLogs(
                ImportStatus.SUCCESS,
                "yazid",
                Instant.parse("2026-07-16T00:00:00Z"),
                Instant.parse("2026-07-16T23:59:59Z"),
                pageable
        );

        assertThat(response.totalElements()).isEqualTo(1);
        assertThat(response.content().getFirst().fileName()).isEqualTo("MTO_Yazid.dat");
        assertThat(response.content().getFirst().displayPath()).isEqualTo("MTO_Yazid.dat");
        verify(importLogRepository).findAll(any(Specification.class), eq(pageable));
    }

    @Test
    void filesReturnCheckpointListingWithoutSensitiveAbsolutePath() {
        UUID batchId = UUID.randomUUID();
        Instant updatedAt = Instant.parse("2026-07-16T11:00:00Z");
        when(importFileStateViewRepository.findAllByOrderByFileNameAsc()).thenReturn(List.of(
                new ImportFileStateView(
                        1L,
                        "/private/input/MTO_Yazid.dat",
                        "MTO_Yazid.dat",
                        Instant.parse("2026-07-16T10:55:00Z"),
                        2048L,
                        250L,
                        Instant.parse("2026-07-16T10:30:00Z"),
                        batchId,
                        updatedAt
                )
        ));

        List<ImporterFileResponse> response = service.getFiles();

        assertThat(response).hasSize(1);
        assertThat(response.getFirst().fileName()).isEqualTo("MTO_Yazid.dat");
        assertThat(response.getFirst().displayPath()).isEqualTo("MTO_Yazid.dat");
        assertThat(response.getFirst().sizeBytes()).isEqualTo(2048L);
        assertThat(response.getFirst().lastProcessedLine()).isEqualTo(250L);
        assertThat(response.getFirst().lastSuccessfulBatchId()).isEqualTo(batchId);
        assertThat(response.getFirst().updatedAt()).isEqualTo(updatedAt);
    }
}
