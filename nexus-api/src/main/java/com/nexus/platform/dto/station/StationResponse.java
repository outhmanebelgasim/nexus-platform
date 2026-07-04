package com.nexus.platform.dto.station;

import com.nexus.domain.enums.StationStatus;

import java.time.Instant;

public record StationResponse(
        Long id,
        Long farmId,
        String name,
        String code,
        Double latitude,
        Double longitude,
        Double altitude,
        StationStatus status,
        Instant createdAt,
        Instant updatedAt
) {
}
