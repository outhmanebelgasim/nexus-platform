package com.nexus.platform.service.impl;

import com.nexus.domain.entity.AppUser;
import com.nexus.domain.enums.Role;
import com.nexus.domain.enums.UserStatus;
import com.nexus.platform.dto.auth.LoginRequest;
import com.nexus.platform.dto.auth.LoginResponse;
import com.nexus.platform.repository.UserRepository;
import com.nexus.platform.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceImplTest {

    private AuthenticationManager authenticationManager;
    private JwtService jwtService;
    private UserRepository userRepository;
    private AuthServiceImpl authService;

    @BeforeEach
    void setUp() {
        authenticationManager = mock(AuthenticationManager.class);
        jwtService = mock(JwtService.class);
        userRepository = mock(UserRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        authService = new AuthServiceImpl(authenticationManager, jwtService, userRepository, passwordEncoder);
    }

    @Test
    void loginReturnsJwtAndUserForValidCredentials() {
        AppUser user = user(UserStatus.ACTIVE);
        LoginRequest request = new LoginRequest(user.getEmail(), "valid-password");

        when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        when(jwtService.generateToken(user)).thenReturn("jwt-token");

        LoginResponse response = authService.login(request);

        assertThat(response.token()).isEqualTo("jwt-token");
        assertThat(response.user().email()).isEqualTo(user.getEmail());
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }

    @Test
    void loginPropagatesBadCredentialsForInvalidPassword() {
        LoginRequest request = new LoginRequest("chakir@gmail.com", "wrong-password");
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void loginPropagatesDisabledExceptionForDisabledUser() {
        LoginRequest request = new LoginRequest("disabled@nexus.local", "valid-password");
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new DisabledException("User is disabled"));

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(DisabledException.class);
    }

    private static AppUser user(UserStatus status) {
        return AppUser.builder()
                .id(12L)
                .fullName("Chakir")
                .email("chakir@gmail.com")
                .passwordHash("$2a$10$hash")
                .role(Role.VIEWER)
                .status(status)
                .createdAt(Instant.parse("2026-01-01T00:00:00Z"))
                .build();
    }
}
