package com.nexus.platform.dto.auth;

import com.nexus.platform.dto.user.UserResponse;

public record LoginResponse(
        String token,
        UserResponse user
) {
}
