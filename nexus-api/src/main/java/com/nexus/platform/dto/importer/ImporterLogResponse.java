package com.nexus.platform.dto.importer;

import com.nexus.domain.enums.ImportStatus;

import java.time.Instant;
import java.util.UUID;

public record ImporterLogResponse(
        Long id,
        UUID batchId,
        String fileName,
        String displayPath,
        ImportStatus status,
        Integer totalRows,
        Integer importedRows,
        Integer skippedRows,
        String errorMessage,
        Instant startedAt,
        Instant finishedAt
) {
}
