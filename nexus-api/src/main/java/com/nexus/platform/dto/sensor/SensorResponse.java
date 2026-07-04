package com.nexus.platform.dto.sensor;

import com.nexus.domain.enums.SensorStatus;

import java.time.Instant;

public record SensorResponse(
        Long id,
        Long stationId,
        String code,
        String name,
        String sensorType,
        String unit,
        Integer depthCm,
        SensorStatus status,
        String metadata,
        Instant createdAt,
        Instant updatedAt
) {
}
