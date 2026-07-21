package com.nexus.platform.dto.station;

import com.nexus.domain.enums.StationStatus;
import com.nexus.domain.enums.StationCategory;

import java.time.Instant;

public record StationResponse(
        Long id,
        Long farmId,
        String farmName,
        String name,
        String code,
        Double latitude,
        Double longitude,
        Double altitude,
        StationStatus status,
        StationCategory stationCategory,
        Instant lastSeenAt,
        Instant createdAt,
        Instant updatedAt
) {
}
