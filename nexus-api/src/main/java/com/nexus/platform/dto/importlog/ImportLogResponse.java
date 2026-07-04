package com.nexus.platform.dto.importlog;

import com.nexus.domain.enums.ImportStatus;

import java.time.Instant;
import java.util.UUID;

public record ImportLogResponse(
        Long id,
        UUID batchId,
        String fileName,
        String filePath,
        ImportStatus status,
        Integer totalRows,
        Integer importedRows,
        Integer skippedRows,
        String errorMessage,
        Instant startedAt,
        Instant finishedAt
) {
}
