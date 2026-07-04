package com.nexus.platform.dto.alert;

import com.nexus.domain.enums.AlertSeverity;
import com.nexus.domain.enums.AlertStatus;

import java.time.Instant;

public record AlertResponse(
        Long id,
        Long sensorId,
        String alertType,
        AlertSeverity severity,
        String message,
        AlertStatus status,
        Instant triggeredAt,
        Instant resolvedAt
) {
}
