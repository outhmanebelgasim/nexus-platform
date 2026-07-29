package com.nexus.platform.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminPasswordResetRequest(
        @NotBlank
        @Size(min = 8, max = 128)
        String newPassword,

        @NotBlank
        @Size(min = 8, max = 128)
        String confirmPassword
) {
}
