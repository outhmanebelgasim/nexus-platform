package com.nexus.platform.mapper;

import com.nexus.domain.entity.Measurement;
import com.nexus.domain.entity.MeasurementId;
import com.nexus.domain.entity.Sensor;
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

        MeasurementId id = new MeasurementId(request.time(), request.sensorId());

        return Measurement.builder()
                .id(id)
                .sensor(sensorReference(request.sensorId()))
                .value(request.value())
                .quality(request.quality())
                .build();
    }

    public static MeasurementResponse toResponse(Measurement measurement) {
        if (measurement == null) {
            return null;
        }

        return new MeasurementResponse(
                getMeasurementTime(measurement),
                getSensorId(measurement),
                measurement.getValue(),
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

    private static Sensor sensorReference(Long sensorId) {
        if (sensorId == null) {
            return null;
        }

        Sensor sensor = new Sensor();
        sensor.setId(sensorId);
        return sensor;
    }

    private static Long getSensorId(Measurement measurement) {
        if (measurement.getId() != null) {
            return measurement.getId().getSensorId();
        }

        return measurement.getSensor() != null ? measurement.getSensor().getId() : null;
    }

    private static java.time.Instant getMeasurementTime(Measurement measurement) {
        return measurement.getId() != null ? measurement.getId().getTime() : null;
    }
}
