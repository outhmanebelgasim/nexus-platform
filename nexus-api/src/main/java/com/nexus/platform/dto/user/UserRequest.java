package com.nexus.platform.dto.user;

import com.nexus.domain.enums.Role;
import com.nexus.domain.enums.MeasurementType;
import com.nexus.domain.enums.UserStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Set;

public record UserRequest(
        @NotBlank
        @Size(max = 150)
        String fullName,

        @NotBlank
        @Email
        @Size(max = 180)
        String email,

        @Size(min = 8, max = 128)
        String password,

        @NotNull
        Role role,

        @NotNull
        UserStatus status,

        Set<Long> farmIds,

        Set<Long> stationIds,

        Set<Long> variableIds,

        Set<MeasurementType> allowedMeasurementTypes
) {
}
