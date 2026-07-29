package com.nexus.platform.dto.graph;

import com.nexus.domain.enums.StationCategory;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record UserGraphConfigurationResponse(
        Long id,
        Long userId,
        Long stationId,
        String stationName,
        String stationCode,
        String title,
        String description,
        StationCategory stationCategory,
        BigDecimal yAxisMin,
        BigDecimal yAxisMax,
        String primaryAxisLabel,
        String primaryAxisUnit,
        boolean secondaryAxisEnabled,
        String secondaryAxisLabel,
        String secondaryAxisUnit,
        BigDecimal secondaryAxisMin,
        BigDecimal secondaryAxisMax,
        Integer displayOrder,
        boolean active,
        Instant createdAt,
        Instant updatedAt,
        List<UserGraphVariableResponse> variables
) {
}
