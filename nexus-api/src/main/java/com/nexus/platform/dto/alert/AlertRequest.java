package com.nexus.platform.dto.alert;

import com.nexus.domain.enums.AlertSeverity;
import com.nexus.domain.enums.AlertStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record AlertRequest(
        @NotNull
        Long sensorId,

        @NotBlank
        @Size(max = 80)
        String alertType,

        @NotNull
        AlertSeverity severity,

        @NotBlank
        String message,

        @NotNull
        AlertStatus status,

        @NotNull
        Instant triggeredAt,

        Instant resolvedAt
) {
}
