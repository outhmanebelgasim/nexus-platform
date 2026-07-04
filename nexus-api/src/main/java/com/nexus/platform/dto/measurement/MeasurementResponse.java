package com.nexus.platform.dto.measurement;

import com.nexus.domain.enums.MeasurementQuality;

import java.time.Instant;
import java.util.UUID;

public record MeasurementResponse(
        Instant time,
        Long sensorId,
        Double value,
        MeasurementQuality quality,
        UUID importBatchId,
        Instant createdAt
) {
}
