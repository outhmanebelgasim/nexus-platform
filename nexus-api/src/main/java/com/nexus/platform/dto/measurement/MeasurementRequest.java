package com.nexus.platform.dto.measurement;

import com.nexus.domain.enums.MeasurementQuality;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record MeasurementRequest(
        @NotNull
        Long sensorId,

        @NotNull
        Instant time,

        @NotNull
        Double value,

        @NotNull
        MeasurementQuality quality
) {
}
