package com.nexus.platform.dto.measurementvariable;

import com.nexus.domain.enums.MeasurementVariableDataType;
import com.nexus.domain.enums.MeasurementType;

import java.time.Instant;

public record MeasurementVariableResponse(
        Long id,
        Long stationId,
        String code,
        String displayName,
        String description,
        String unit,
        MeasurementVariableDataType dataType,
        MeasurementType measurementType,
        boolean active,
        Instant firstSeenAt,
        Instant lastSeenAt,
        Instant createdAt,
        Instant updatedAt
) {
}
