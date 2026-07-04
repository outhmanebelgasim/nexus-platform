package com.nexus.platform.dto.farm;

import java.time.Instant;

public record FarmResponse(
        Long id,
        String name,
        String location,
        String description,
        String googleMapsUrl,
        Instant createdAt,
        Instant updatedAt
) {
}
