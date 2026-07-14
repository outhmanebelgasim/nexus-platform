package com.nexus.platform.mapper;

import com.nexus.domain.entity.Alert;
import com.nexus.domain.entity.MeasurementVariable;
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
                .measurementVariable(variableReference(resolveVariableId(request)))
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
                getVariableId(alert),
                getVariableId(alert),
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

    private static Long resolveVariableId(AlertRequest request) {
        return request.variableId() != null ? request.variableId() : request.sensorId();
    }

    private static MeasurementVariable variableReference(Long variableId) {
        if (variableId == null) {
            return null;
        }

        MeasurementVariable measurementVariable = new MeasurementVariable();
        measurementVariable.setId(variableId);
        return measurementVariable;
    }

    private static Long getVariableId(Alert alert) {
        return alert.getMeasurementVariable() != null ? alert.getMeasurementVariable().getId() : null;
    }
}
