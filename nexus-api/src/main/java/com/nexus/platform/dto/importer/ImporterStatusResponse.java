package com.nexus.platform.dto.importer;

import java.time.Instant;

public record ImporterStatusResponse(
        Instant lastExecution,
        Instant lastSuccess,
        Instant lastFailure,
        long successCount,
        long partialSuccessCount,
        long failedCount,
        long trackedFileCount,
        long stationCount,
        long variableCount,
        long measurementCount
) {
}
