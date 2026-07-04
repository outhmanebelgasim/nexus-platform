package com.nexus.platform.mapper;

import com.nexus.domain.entity.Farm;
import com.nexus.platform.dto.farm.FarmRequest;
import com.nexus.platform.dto.farm.FarmResponse;

import java.util.List;

public final class FarmMapper {

    private FarmMapper() {
    }

    public static Farm toEntity(FarmRequest request) {
        if (request == null) {
            return null;
        }

        return Farm.builder()
                .name(request.name())
                .location(request.location())
                .description(request.description())
                .googleMapsUrl(request.googleMapsUrl())
                .build();
    }

    public static FarmResponse toResponse(Farm farm) {
        if (farm == null) {
            return null;
        }

        return new FarmResponse(
                farm.getId(),
                farm.getName(),
                farm.getLocation(),
                farm.getDescription(),
                farm.getGoogleMapsUrl(),
                farm.getCreatedAt(),
                farm.getUpdatedAt()
        );
    }

    public static List<FarmResponse> toResponseList(List<Farm> farms) {
        if (farms == null) {
            return List.of();
        }

        return farms.stream()
                .map(FarmMapper::toResponse)
                .toList();
    }
}
