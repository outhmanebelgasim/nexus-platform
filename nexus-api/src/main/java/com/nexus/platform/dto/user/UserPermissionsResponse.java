package com.nexus.platform.dto.user;

import com.nexus.domain.enums.MeasurementType;
import com.nexus.domain.enums.Role;

import java.util.Set;

public record UserPermissionsResponse(
        Role role,
        Set<Long> farmIds,
        Set<Long> stationIds,
        Set<MeasurementType> allowedMeasurementTypes
) {
}
