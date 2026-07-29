package com.nexus.platform.auth;

import com.nexus.domain.entity.AppUser;
import com.nexus.domain.enums.Role;
import com.nexus.domain.enums.UserStatus;
import com.nexus.platform.dto.auth.LoginRequest;
import com.nexus.platform.dto.auth.LoginResponse;
import com.nexus.platform.dto.user.AdminPasswordResetRequest;
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
import java.util.ArrayList;
import java.util.List;

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

    private final List<String> createdEmails = new ArrayList<>();

    @AfterEach
    void cleanUp() {
        for (String createdEmail : createdEmails) {
            if (createdEmail != null) {
                userRepository.findByEmailIgnoreCase(createdEmail).ifPresent(userRepository::delete);
            }
        }
        createdEmails.clear();
    }

    @Test
    void createPersistsBCryptHashAndActiveUserCanLogin() {
        String rawPassword = "TempPass123!";
        String createdEmail = trackEmail("auth-" + UUID.randomUUID() + "@nexus.local");

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
        String createdEmail = trackEmail("duplicate-" + UUID.randomUUID() + "@nexus.local");
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

    @Test
    void adminPasswordResetRequiresNewPasswordForNextLogin() {
        String superAdminEmail = trackEmail("reset-super-" + UUID.randomUUID() + "@nexus.local");
        String technicianEmail = trackEmail("reset-tech-" + UUID.randomUUID() + "@nexus.local");
        String oldPassword = "OldPass123!";
        String newPassword = "NewPass123!";

        userService.create(new UserRequest(
                "Reset Super",
                superAdminEmail,
                "SuperPass123!",
                Role.SUPER_ADMIN,
                UserStatus.ACTIVE,
                Set.of(),
                Set.of(),
                Set.of(),
                Set.of()
        ));
        userService.create(new UserRequest(
                "Reset Technician",
                technicianEmail,
                oldPassword,
                Role.TECHNICIAN,
                UserStatus.ACTIVE,
                Set.of(),
                Set.of(),
                Set.of(),
                Set.of()
        ));
        AppUser technician = userRepository.findByEmailIgnoreCase(technicianEmail).orElseThrow();

        userService.resetPassword(technician.getId(), new AdminPasswordResetRequest(newPassword, newPassword), superAdminEmail);

        assertThatThrownBy(() -> authService.login(new LoginRequest(technicianEmail, oldPassword)))
                .isInstanceOf(BadCredentialsException.class);
        assertThat(authService.login(new LoginRequest(technicianEmail, newPassword)).token()).isNotBlank();
    }

    private String trackEmail(String email) {
        createdEmails.add(email);
        return email;
    }
}
