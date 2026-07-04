package com.nexus.platform.dto.user;

import com.nexus.domain.enums.UserRole;

import java.time.Instant;

public record UserResponse(
        Long id,
        String fullName,
        String email,
        UserRole role,
        Boolean enabled,
        Instant createdAt,
        Instant updatedAt
) {
}
