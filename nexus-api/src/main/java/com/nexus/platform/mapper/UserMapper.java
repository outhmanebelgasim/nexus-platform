package com.nexus.platform.mapper;

import com.nexus.domain.entity.AppUser;
import com.nexus.platform.dto.user.UserRequest;
import com.nexus.platform.dto.user.UserResponse;

import java.util.List;

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
                user.getUpdatedAt()
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
}
