package com.nexus.platform.service.impl;

import com.nexus.domain.entity.AppUser;
import com.nexus.domain.enums.Role;
import com.nexus.domain.enums.UserStatus;
import com.nexus.platform.repository.UserRepository;
import com.nexus.platform.service.AccessControlService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserServiceImplTest {

    private UserRepository userRepository;
    private UserServiceImpl userService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        AccessControlService accessControlService = mock(AccessControlService.class);
        userService = new UserServiceImpl(userRepository, passwordEncoder, accessControlService);
    }

    @Test
    void findAllReturnsAllUsersForSuperAdmin() {
        AppUser superAdmin = user(1L, "super@nexus.local", Role.SUPER_ADMIN);
        AppUser admin = user(2L, "admin@nexus.local", Role.ADMIN);
        AppUser technician = user(3L, "technician@nexus.local", Role.TECHNICIAN);

        when(userRepository.findByEmail(superAdmin.getEmail())).thenReturn(Optional.of(superAdmin));
        when(userRepository.findAll()).thenReturn(List.of(superAdmin, admin, technician));

        assertThat(userService.findAll(superAdmin.getEmail()))
                .extracting("role")
                .containsExactly(Role.SUPER_ADMIN, Role.ADMIN, Role.TECHNICIAN);
    }

    @Test
    void findAllReturnsOnlyTechniciansAndViewersForAdmin() {
        AppUser admin = user(1L, "admin@nexus.local", Role.ADMIN);
        AppUser technician = user(2L, "technician@nexus.local", Role.TECHNICIAN);
        AppUser viewer = user(3L, "viewer@nexus.local", Role.VIEWER);

        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(userRepository.findByRoleIn(argThat(UserServiceImplTest::containsOnlyAdminManagedRoles)))
                .thenReturn(List.of(technician, viewer));

        assertThat(userService.findAll(admin.getEmail()))
                .extracting("role")
                .containsExactly(Role.TECHNICIAN, Role.VIEWER);

        verify(userRepository, never()).findAll();
    }

    @Test
    void findByIdDeniesAdminTargetingAdmin() {
        AppUser admin = user(1L, "admin@nexus.local", Role.ADMIN);
        AppUser targetAdmin = user(2L, "target-admin@nexus.local", Role.ADMIN);

        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(userRepository.findById(targetAdmin.getId())).thenReturn(Optional.of(targetAdmin));

        assertThatThrownBy(() -> userService.findById(targetAdmin.getId(), admin.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void updateStatusDeniesAdminTargetingSuperAdmin() {
        AppUser admin = user(1L, "admin@nexus.local", Role.ADMIN);
        AppUser superAdmin = user(2L, "super@nexus.local", Role.SUPER_ADMIN);

        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(userRepository.findById(superAdmin.getId())).thenReturn(Optional.of(superAdmin));

        assertThatThrownBy(() -> userService.updateStatus(superAdmin.getId(), UserStatus.DISABLED, admin.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    private static boolean containsOnlyAdminManagedRoles(Collection<Role> roles) {
        return roles.size() == 2 && roles.contains(Role.TECHNICIAN) && roles.contains(Role.VIEWER);
    }

    private static AppUser user(Long id, String email, Role role) {
        return AppUser.builder()
                .id(id)
                .fullName("Test User")
                .email(email)
                .passwordHash("hash")
                .role(role)
                .status(UserStatus.ACTIVE)
                .createdAt(Instant.parse("2026-01-01T00:00:00Z"))
                .build();
    }
}
