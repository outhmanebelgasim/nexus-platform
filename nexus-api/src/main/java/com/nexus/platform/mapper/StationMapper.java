package com.nexus.platform.mapper;

import com.nexus.domain.entity.Farm;
import com.nexus.domain.entity.Station;
import com.nexus.platform.dto.station.StationRequest;
import com.nexus.platform.dto.station.StationResponse;

import java.util.List;

public final class StationMapper {

    private StationMapper() {
    }

    public static Station toEntity(StationRequest request) {
        if (request == null) {
            return null;
        }

        return Station.builder()
                .farm(farmReference(request.farmId()))
                .name(request.name())
                .code(request.code())
                .latitude(request.latitude())
                .longitude(request.longitude())
                .altitude(request.altitude())
                .status(request.status())
                .build();
    }

    public static StationResponse toResponse(Station station) {
        if (station == null) {
            return null;
        }

        return new StationResponse(
                station.getId(),
                getFarmId(station),
                station.getName(),
                station.getCode(),
                station.getLatitude(),
                station.getLongitude(),
                station.getAltitude(),
                station.getStatus(),
                station.getCreatedAt(),
                station.getUpdatedAt()
        );
    }

    public static List<StationResponse> toResponseList(List<Station> stations) {
        if (stations == null) {
            return List.of();
        }

        return stations.stream()
                .map(StationMapper::toResponse)
                .toList();
    }

    private static Farm farmReference(Long farmId) {
        if (farmId == null) {
            return null;
        }

        Farm farm = new Farm();
        farm.setId(farmId);
        return farm;
    }

    private static Long getFarmId(Station station) {
        return station.getFarm() != null ? station.getFarm().getId() : null;
    }
}
