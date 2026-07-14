package com.nexus.platform.dto.measurement;

import com.nexus.domain.enums.MeasurementQuality;

import java.time.Instant;
import java.util.UUID;

public record MeasurementResponse(
        Instant measuredAt,
        Long variableId,
        Double numericValue,
        String textValue,
        MeasurementQuality quality,
        UUID importBatchId,
        Instant createdAt
) {
}
