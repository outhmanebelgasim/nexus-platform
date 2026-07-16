package com.nexus.platform.dto.importer;

import java.time.Instant;
import java.util.UUID;

public record ImporterFileResponse(
        String fileName,
        String displayPath,
        long sizeBytes,
        Instant lastModifiedAt,
        Long lastProcessedLine,
        Instant lastProcessedTimestamp,
        UUID lastSuccessfulBatchId,
        Instant updatedAt
) {
}
