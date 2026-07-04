package com.nexus.platform.mapper;

import com.nexus.domain.entity.Sensor;
import com.nexus.domain.entity.Station;
import com.nexus.platform.dto.sensor.SensorRequest;
import com.nexus.platform.dto.sensor.SensorResponse;

import java.util.List;

public final class SensorMapper {

    private SensorMapper() {
    }

    public static Sensor toEntity(SensorRequest request) {
        if (request == null) {
            return null;
        }

        return Sensor.builder()
                .station(stationReference(request.stationId()))
                .code(request.code())
                .name(request.name())
                .sensorType(request.sensorType())
                .unit(request.unit())
                .depthCm(request.depthCm())
                .status(request.status())
                .metadata(request.metadata())
                .build();
    }

    public static SensorResponse toResponse(Sensor sensor) {
        if (sensor == null) {
            return null;
        }

        return new SensorResponse(
                sensor.getId(),
                getStationId(sensor),
                sensor.getCode(),
                sensor.getName(),
                sensor.getSensorType(),
                sensor.getUnit(),
                sensor.getDepthCm(),
                sensor.getStatus(),
                sensor.getMetadata(),
                sensor.getCreatedAt(),
                sensor.getUpdatedAt()
        );
    }

    public static List<SensorResponse> toResponseList(List<Sensor> sensors) {
        if (sensors == null) {
            return List.of();
        }

        return sensors.stream()
                .map(SensorMapper::toResponse)
                .toList();
    }

    private static Station stationReference(Long stationId) {
        if (stationId == null) {
            return null;
        }

        Station station = new Station();
        station.setId(stationId);
        return station;
    }

    private static Long getStationId(Sensor sensor) {
        return sensor.getStation() != null ? sensor.getStation().getId() : null;
    }
}
