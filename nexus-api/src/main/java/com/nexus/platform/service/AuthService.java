package com.nexus.platform.service;

import com.nexus.platform.dto.auth.LoginRequest;
import com.nexus.platform.dto.auth.LoginResponse;
import com.nexus.platform.dto.auth.RegisterRequest;
import com.nexus.platform.dto.user.UserResponse;

public interface AuthService {

    LoginResponse login(LoginRequest request);

    UserResponse register(RegisterRequest request);

    UserResponse currentUser(String email);
}
