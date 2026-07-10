package com.nexus.platform.mapper;

import com.nexus.domain.entity.AppUser;
import com.nexus.domain.entity.Farm;
import com.nexus.domain.entity.Station;
import com.nexus.platform.dto.user.UserRequest;
import com.nexus.platform.dto.user.UserResponse;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public final class UserMapper {

    private UserMapper() {
    }

    public static AppUser toEntity(UserRequest request) {
        if (request == null) {
            return null;
        }

        return AppUser.builder()
                .fullName(request.fullName())
                .email(request.email())
                .role(request.role())
                .status(request.status())
                .build();
    }

    public static UserResponse toResponse(AppUser user) {
        if (user == null) {
            return null;
        }

        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getCreatedById(),
                user.getRole(),
                user.getStatus(),
                user.getCreatedAt(),
                user.getUpdatedAt(),
                ids(user.getFarms()),
                ids(user.getStations()),
                user.getAllowedMeasurementTypes() == null ? Set.of() : Set.copyOf(user.getAllowedMeasurementTypes())
        );
    }

    public static List<UserResponse> toResponseList(List<AppUser> users) {
        if (users == null) {
            return List.of();
        }

        return users.stream()
                .map(UserMapper::toResponse)
                .toList();
    }

    private static Set<Long> ids(Set<? extends Object> resources) {
        if (resources == null) {
            return Set.of();
        }

        return resources.stream()
                .map(resource -> {
                    if (resource instanceof Farm farm) {
                        return farm.getId();
                    }
                    if (resource instanceof Station station) {
                        return station.getId();
                    }
                    throw new IllegalArgumentException("Unsupported access resource type");
                })
                .collect(Collectors.toUnmodifiableSet());
    }
}
