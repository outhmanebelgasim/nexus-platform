package com.nexus.platform.dto.sensor;

import com.nexus.domain.enums.SensorStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SensorRequest(
        @NotNull
        Long stationId,

        @NotBlank
        @Size(max = 150)
        String code,

        @Size(max = 150)
        String name,

        @NotBlank
        @Size(max = 80)
        String sensorType,

        @Size(max = 30)
        String unit,

        Integer depthCm,

        @NotNull
        SensorStatus status,

        String metadata
) {
}
