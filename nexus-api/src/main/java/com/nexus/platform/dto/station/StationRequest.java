package com.nexus.platform.dto.station;

import com.nexus.domain.enums.StationStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StationRequest(
        @NotNull
        Long farmId,

        @NotBlank
        @Size(max = 150)
        String name,

        @NotBlank
        @Size(max = 100)
        String code,

        Double latitude,
        Double longitude,
        Double altitude,

        @NotNull
        StationStatus status
) {
}
