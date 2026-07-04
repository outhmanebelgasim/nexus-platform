package com.nexus.platform.dto.user;

import com.nexus.domain.enums.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UserRequest(
        @NotBlank
        @Size(max = 150)
        String fullName,

        @NotBlank
        @Email
        @Size(max = 180)
        String email,

        @NotBlank
        @Size(min = 8, max = 128)
        String password,

        @NotNull
        UserRole role,

        @NotNull
        Boolean enabled
) {
}
