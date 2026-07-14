package com.nexus.platform.mapper;

import com.nexus.domain.entity.Measurement;
import com.nexus.domain.entity.MeasurementId;
import com.nexus.domain.entity.MeasurementVariable;
import com.nexus.platform.dto.measurement.MeasurementRequest;
import com.nexus.platform.dto.measurement.MeasurementResponse;

import java.util.List;

public final class MeasurementMapper {

    private MeasurementMapper() {
    }

    public static Measurement toEntity(MeasurementRequest request) {
        if (request == null) {
            return null;
        }

        MeasurementId id = new MeasurementId(request.measuredAt(), request.variableId());

        return Measurement.builder()
                .id(id)
                .measurementVariable(variableReference(request.variableId()))
                .numericValue(request.numericValue())
                .textValue(request.textValue())
                .quality(request.quality())
                .build();
    }

    public static MeasurementResponse toResponse(Measurement measurement) {
        if (measurement == null) {
            return null;
        }

        return new MeasurementResponse(
                getMeasurementTime(measurement),
                getVariableId(measurement),
                measurement.getNumericValue(),
                measurement.getTextValue(),
                measurement.getQuality(),
                measurement.getImportBatchId(),
                measurement.getCreatedAt()
        );
    }

    public static List<MeasurementResponse> toResponseList(List<Measurement> measurements) {
        if (measurements == null) {
            return List.of();
        }

        return measurements.stream()
                .map(MeasurementMapper::toResponse)
                .toList();
    }

    private static MeasurementVariable variableReference(Long variableId) {
        if (variableId == null) {
            return null;
        }

        MeasurementVariable measurementVariable = new MeasurementVariable();
        measurementVariable.setId(variableId);
        return measurementVariable;
    }

    private static Long getVariableId(Measurement measurement) {
        if (measurement.getId() != null) {
            return measurement.getId().getVariableId();
        }

        return measurement.getMeasurementVariable() != null ? measurement.getMeasurementVariable().getId() : null;
    }

    private static java.time.Instant getMeasurementTime(Measurement measurement) {
        return measurement.getId() != null ? measurement.getId().getMeasuredAt() : null;
    }
}
