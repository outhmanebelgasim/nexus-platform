package com.nexus.platform.service.impl;

import com.nexus.domain.entity.AppUser;
import com.nexus.domain.enums.Role;
import com.nexus.domain.enums.UserStatus;
import com.nexus.platform.dto.user.UserRequest;
import com.nexus.platform.dto.user.UserPermissionsResponse;
import com.nexus.platform.dto.user.UserResponse;
import com.nexus.platform.dto.user.PasswordUpdateRequest;
import com.nexus.platform.dto.user.ProfileUpdateRequest;
import com.nexus.platform.exception.DuplicateResourceException;
import com.nexus.platform.exception.ResourceNotFoundException;
import com.nexus.platform.mapper.UserMapper;
import com.nexus.platform.repository.UserRepository;
import com.nexus.platform.service.AccessControlService;
import com.nexus.platform.service.UserService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

    private static final Set<Role> ADMIN_MANAGED_ROLES = EnumSet.of(Role.TECHNICIAN, Role.VIEWER);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AccessControlService accessControlService;

    public UserServiceImpl(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AccessControlService accessControlService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.accessControlService = accessControlService;
    }

    @Override
    public List<UserResponse> findAll(String currentUserEmail) {
        AppUser currentUser = findCurrentUser(currentUserEmail);
        if (currentUser.getRole() == Role.SUPER_ADMIN) {
            return UserMapper.toResponseList(userRepository.findAll());
        }

        ensureAdmin(currentUser);
        return UserMapper.toResponseList(userRepository.findByRoleIn(ADMIN_MANAGED_ROLES));
    }

    @Override
    public UserResponse findById(Long id, String currentUserEmail) {
        AppUser targetUser = findUserById(id);
        ensureCanManageUser(findCurrentUser(currentUserEmail), targetUser);
        return UserMapper.toResponse(targetUser);
    }

    @Override
    public UserResponse findByEmail(String email, String currentUserEmail) {
        AppUser currentUser = findCurrentUser(currentUserEmail);
        String normalizedEmail = normalizeEmail(email);
        if (currentUser.getRole() == Role.SUPER_ADMIN) {
            return UserMapper.toResponse(userRepository.findByEmailIgnoreCase(normalizedEmail)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + normalizedEmail)));
        }

        ensureAdmin(currentUser);
        return UserMapper.toResponse(userRepository.findByEmailIgnoreCaseAndRoleIn(normalizedEmail, ADMIN_MANAGED_ROLES)
                .orElseThrow(() -> new AccessDeniedException("You do not have permission to perform this action")));
    }

    @Override
    public UserResponse currentUser(String email) {
        return UserMapper.toResponse(findByEmailOrThrow(email));
    }

    @Override
    public UserPermissionsResponse currentUserPermissions(String email) {
        return accessControlService.permissionsFor(email);
    }

    @Override
    @Transactional
    public UserResponse updateProfile(String email, ProfileUpdateRequest request) {
        AppUser user = findByEmailOrThrow(email);
        String normalizedEmail = normalizeEmail(request.email());
        ensureEmailIsAvailableForUpdate(normalizedEmail, user.getId());
        user.setFullName(request.fullName());
        user.setEmail(normalizedEmail);
        user.setUpdatedAt(Instant.now());
        return UserMapper.toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public void updatePassword(String email, PasswordUpdateRequest request) {
        AppUser user = findByEmailOrThrow(email);
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
    }

    @Override
    @Transactional
    public UserResponse create(UserRequest request) {
        return create(request, null);
    }

    @Override
    @Transactional
    public UserResponse create(UserRequest request, String currentUserEmail) {
        if (request.password() == null || request.password().isBlank()) {
            throw new IllegalArgumentException("Password is required");
        }
        String normalizedEmail = normalizeEmail(request.email());
        ensureEmailIsAvailable(normalizedEmail);
        AppUser currentUser = findCurrentUser(currentUserEmail);
        ensureCanManageRole(currentUser, request.role());

        AppUser user = UserMapper.toEntity(request);
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        if (currentUser != null) {
            user.setCreatedById(currentUser.getId());
        }
        user.setCreatedAt(Instant.now());
        accessControlService.assignAccess(currentUser, user, request.farmIds(), request.stationIds(), request.allowedMeasurementTypes());
        return UserMapper.toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserResponse update(Long id, UserRequest request) {
        return update(id, request, null);
    }

    @Override
    @Transactional
    public UserResponse update(Long id, UserRequest request, String currentUserEmail) {
        AppUser user = findUserById(id);
        String normalizedEmail = normalizeEmail(request.email());
        ensureEmailIsAvailableForUpdate(normalizedEmail, id);
        AppUser currentUser = findCurrentUser(currentUserEmail);
        ensureCanManageUser(currentUser, user);
        ensureCanManageRole(currentUser, request.role());
        ensureCurrentAdminRemainsActive(user, request.status(), currentUser);

        AppUser updatedUser = UserMapper.toEntity(request);
        user.setFullName(updatedUser.getFullName());
        user.setEmail(normalizedEmail);
        user.setRole(updatedUser.getRole());
        user.setStatus(updatedUser.getStatus());
        accessControlService.assignAccess(currentUser, user, request.farmIds(), request.stationIds(), request.allowedMeasurementTypes());
        if (request.password() != null && !request.password().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.password()));
        }
        user.setUpdatedAt(Instant.now());

        return UserMapper.toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserResponse updateStatus(Long id, UserStatus status, String currentUserEmail) {
        AppUser user = findUserById(id);
        AppUser currentUser = findCurrentUser(currentUserEmail);
        ensureCanManageUser(currentUser, user);
        ensureCurrentAdminRemainsActive(user, status, currentUser);
        user.setStatus(status);
        user.setUpdatedAt(Instant.now());
        return UserMapper.toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public void delete(Long id, String currentUserEmail) {
        AppUser currentUser = findCurrentUser(currentUserEmail);
        AppUser targetUser = findUserById(id);
        ensureCanPermanentlyDelete(currentUser, targetUser);
        userRepository.clearCreatedById(targetUser.getId());
        userRepository.delete(targetUser);
    }

    private AppUser findUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }

    private AppUser findByEmailOrThrow(String email) {
        return userRepository.findByEmailIgnoreCase(normalizeEmail(email))
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private void ensureEmailIsAvailable(String email) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateResourceException("User already exists with email: " + email);
        }
    }

    private void ensureEmailIsAvailableForUpdate(String email, Long userId) {
        if (userRepository.existsByEmailIgnoreCaseAndIdNot(email, userId)) {
            throw new DuplicateResourceException("User already exists with email: " + email);
        }
    }

    private AppUser findCurrentUser(String currentUserEmail) {
        if (currentUserEmail == null || currentUserEmail.isBlank()) {
            return null;
        }

        return userRepository.findByEmailIgnoreCase(normalizeEmail(currentUserEmail))
                .orElseThrow(() -> new ResourceNotFoundException("Current user not found"));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    private void ensureCanManageUser(AppUser currentUser, AppUser targetUser) {
        if (currentUser == null || currentUser.getRole() == Role.SUPER_ADMIN) {
            return;
        }

        ensureAdmin(currentUser);
        if (!ADMIN_MANAGED_ROLES.contains(targetUser.getRole())) {
            throw new AccessDeniedException("You do not have permission to perform this action");
        }
    }

    private void ensureCanManageRole(AppUser currentUser, Role requestedRole) {
        if (currentUser == null || currentUser.getRole() == Role.SUPER_ADMIN) {
            return;
        }

        if (currentUser.getRole() != Role.ADMIN || requestedRole == Role.SUPER_ADMIN || requestedRole == Role.ADMIN) {
            throw new AccessDeniedException("You do not have permission to perform this action");
        }
    }

    private void ensureAdmin(AppUser currentUser) {
        if (currentUser == null || currentUser.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("You do not have permission to perform this action");
        }
    }

    private void ensureCurrentAdminRemainsActive(AppUser user, UserStatus requestedStatus, AppUser currentUser) {
        if (requestedStatus == UserStatus.DISABLED && currentUser != null && user.getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("Administrators cannot disable their own account");
        }
    }

    private void ensureCanPermanentlyDelete(AppUser currentUser, AppUser targetUser) {
        if (currentUser == null || currentUser.getRole() != Role.SUPER_ADMIN) {
            throw new AccessDeniedException("You do not have permission to perform this action");
        }

        if (currentUser.getId().equals(targetUser.getId())) {
            throw new IllegalArgumentException("You cannot delete your own account");
        }

        if (targetUser.getRole() == Role.SUPER_ADMIN && countSuperAdmins() <= 1) {
            throw new IllegalArgumentException("Cannot delete the last remaining super administrator");
        }
    }

    private long countSuperAdmins() {
        return userRepository.findAll().stream()
                .filter(user -> user.getRole() == Role.SUPER_ADMIN)
                .count();
    }
}
