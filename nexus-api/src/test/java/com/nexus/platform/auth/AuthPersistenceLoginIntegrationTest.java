package com.nexus.platform.auth;

import com.nexus.domain.entity.AppUser;
import com.nexus.domain.enums.Role;
import com.nexus.domain.enums.UserStatus;
import com.nexus.platform.dto.auth.LoginRequest;
import com.nexus.platform.dto.auth.LoginResponse;
import com.nexus.platform.dto.user.UserRequest;
import com.nexus.platform.exception.DuplicateResourceException;
import com.nexus.platform.repository.UserRepository;
import com.nexus.platform.service.AuthService;
import com.nexus.platform.service.UserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class AuthPersistenceLoginIntegrationTest {

    @Autowired
    private UserService userService;

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String createdEmail;

    @AfterEach
    void cleanUp() {
        if (createdEmail != null) {
            userRepository.findByEmailIgnoreCase(createdEmail).ifPresent(userRepository::delete);
        }
    }

    @Test
    void createPersistsBCryptHashAndActiveUserCanLogin() {
        String rawPassword = "TempPass123!";
        createdEmail = "auth-" + UUID.randomUUID() + "@nexus.local";

        userService.create(new UserRequest(
                "Auth Integration User",
                createdEmail.toUpperCase(),
                rawPassword,
                Role.VIEWER,
                UserStatus.ACTIVE,
                Set.of(),
                Set.of(),
                Set.of(),
                Set.of()
        ));

        AppUser persisted = userRepository.findByEmailIgnoreCase(createdEmail)
                .orElseThrow();

        assertThat(persisted.getEmail()).isEqualTo(createdEmail);
        assertThat(persisted.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(persisted.getPasswordHash()).startsWith("$2");
        assertThat(persisted.getPasswordHash()).isNotEqualTo(rawPassword);
        assertThat(passwordEncoder.matches(rawPassword, persisted.getPasswordHash())).isTrue();

        LoginResponse response = authService.login(new LoginRequest(createdEmail.toUpperCase(), rawPassword));

        assertThat(response.token()).isNotBlank();
        assertThat(response.user().email()).isEqualTo(createdEmail);
    }

    @Test
    void duplicateEmailIsRejectedClearlyAndInvalidCredentialsRemainUnauthorized() {
        String rawPassword = "TempPass123!";
        createdEmail = "duplicate-" + UUID.randomUUID() + "@nexus.local";
        UserRequest request = new UserRequest(
                "Duplicate User",
                createdEmail,
                rawPassword,
                Role.VIEWER,
                UserStatus.ACTIVE,
                Set.of(),
                Set.of(),
                Set.of(),
                Set.of()
        );

        userService.create(request);

        assertThatThrownBy(() -> userService.create(new UserRequest(
                "Duplicate User Two",
                createdEmail.toUpperCase(),
                rawPassword,
                Role.VIEWER,
                UserStatus.ACTIVE,
                Set.of(),
                Set.of(),
                Set.of(),
                Set.of()
        ))).isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("User already exists with email");

        assertThatThrownBy(() -> authService.login(new LoginRequest(createdEmail, "WrongPass123!")))
                .isInstanceOf(BadCredentialsException.class);
    }
}
