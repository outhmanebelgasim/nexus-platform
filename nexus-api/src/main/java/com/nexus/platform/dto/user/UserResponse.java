package com.nexus.platform.dto.user;

import com.nexus.domain.enums.MeasurementType;
import com.nexus.domain.enums.Role;
import com.nexus.domain.enums.UserStatus;

import java.time.Instant;
import java.util.Set;

public record UserResponse(
        Long id,
        String fullName,
        String email,
        Long createdById,
        Role role,
        UserStatus status,
        Instant createdAt,
        Instant updatedAt,
        Set<Long> farmIds,
        Set<Long> stationIds,
        Set<Long> variableIds,
        Set<MeasurementType> allowedMeasurementTypes
) {
}
