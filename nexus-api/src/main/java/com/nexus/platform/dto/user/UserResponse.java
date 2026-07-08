package com.nexus.platform.dto.user;

import com.nexus.domain.enums.Role;
import com.nexus.domain.enums.UserStatus;

import java.time.Instant;

public record UserResponse(
        Long id,
        String fullName,
        String email,
        Long createdById,
        Role role,
        UserStatus status,
        Instant createdAt,
        Instant updatedAt
) {
}
