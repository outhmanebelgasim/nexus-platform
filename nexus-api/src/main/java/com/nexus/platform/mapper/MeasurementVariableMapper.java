package com.nexus.platform.mapper;

import com.nexus.domain.entity.MeasurementVariable;
import com.nexus.platform.dto.measurementvariable.MeasurementVariableRequest;
import com.nexus.platform.dto.measurementvariable.MeasurementVariableResponse;

import java.util.List;

public final class MeasurementVariableMapper {

    private MeasurementVariableMapper() {
    }

    public static MeasurementVariableResponse toResponse(MeasurementVariable measurementVariable) {
        if (measurementVariable == null) {
            return null;
        }

        return new MeasurementVariableResponse(
                measurementVariable.getId(),
                getStationId(measurementVariable),
                measurementVariable.getCode(),
                measurementVariable.getDisplayName(),
                measurementVariable.getDescription(),
                measurementVariable.getUnit(),
                measurementVariable.getDataType(),
                measurementVariable.isActive(),
                measurementVariable.getFirstSeenAt(),
                measurementVariable.getLastSeenAt(),
                measurementVariable.getCreatedAt(),
                measurementVariable.getUpdatedAt()
        );
    }

    public static List<MeasurementVariableResponse> toResponseList(List<MeasurementVariable> measurementVariables) {
        if (measurementVariables == null) {
            return List.of();
        }

        return measurementVariables.stream()
                .map(MeasurementVariableMapper::toResponse)
                .toList();
    }

    private static Long getStationId(MeasurementVariable measurementVariable) {
        return measurementVariable.getStation() != null ? measurementVariable.getStation().getId() : null;
    }
}
