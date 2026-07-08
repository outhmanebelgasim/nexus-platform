package com.nexus.platform.dto.user;

import com.nexus.domain.enums.UserStatus;
import jakarta.validation.constraints.NotNull;

public record UserStatusRequest(
        @NotNull
        UserStatus status
) {
}
