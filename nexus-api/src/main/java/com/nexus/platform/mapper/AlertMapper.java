package com.nexus.platform.mapper;

import com.nexus.domain.entity.Alert;
import com.nexus.domain.entity.Sensor;
import com.nexus.platform.dto.alert.AlertRequest;
import com.nexus.platform.dto.alert.AlertResponse;

import java.util.List;

public final class AlertMapper {

    private AlertMapper() {
    }

    public static Alert toEntity(AlertRequest request) {
        if (request == null) {
            return null;
        }

        return Alert.builder()
                .sensor(sensorReference(request.sensorId()))
                .alertType(request.alertType())
                .severity(request.severity())
                .message(request.message())
                .status(request.status())
                .triggeredAt(request.triggeredAt())
                .resolvedAt(request.resolvedAt())
                .build();
    }

    public static AlertResponse toResponse(Alert alert) {
        if (alert == null) {
            return null;
        }

        return new AlertResponse(
                alert.getId(),
                getSensorId(alert),
                alert.getAlertType(),
                alert.getSeverity(),
                alert.getMessage(),
                alert.getStatus(),
                alert.getTriggeredAt(),
                alert.getResolvedAt()
        );
    }

    public static List<AlertResponse> toResponseList(List<Alert> alerts) {
        if (alerts == null) {
            return List.of();
        }

        return alerts.stream()
                .map(AlertMapper::toResponse)
                .toList();
    }

    private static Sensor sensorReference(Long sensorId) {
        if (sensorId == null) {
            return null;
        }

        Sensor sensor = new Sensor();
        sensor.setId(sensorId);
        return sensor;
    }

    private static Long getSensorId(Alert alert) {
        return alert.getSensor() != null ? alert.getSensor().getId() : null;
    }
}
