package com.nexus.platform.dto.measurement;

import com.nexus.domain.enums.MeasurementQuality;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record MeasurementRequest(
        @NotNull
        Long variableId,

        @NotNull
        Instant measuredAt,

        Double numericValue,

        String textValue,

        @NotNull
        MeasurementQuality quality
) {
}
