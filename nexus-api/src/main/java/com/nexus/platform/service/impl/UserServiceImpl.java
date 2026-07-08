package com.nexus.platform.service.impl;

import com.nexus.domain.entity.AppUser;
import com.nexus.domain.enums.Role;
import com.nexus.domain.enums.UserStatus;
import com.nexus.platform.dto.user.UserRequest;
import com.nexus.platform.dto.user.UserResponse;
import com.nexus.platform.dto.user.PasswordUpdateRequest;
import com.nexus.platform.dto.user.ProfileUpdateRequest;
import com.nexus.platform.exception.DuplicateResourceException;
import com.nexus.platform.exception.ResourceNotFoundException;
import com.nexus.platform.mapper.UserMapper;
import com.nexus.platform.repository.UserRepository;
import com.nexus.platform.service.UserService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public List<UserResponse> findAll() {
        return UserMapper.toResponseList(userRepository.findAll());
    }

    @Override
    public UserResponse findById(Long id) {
        return UserMapper.toResponse(findUserById(id));
    }

    @Override
    public UserResponse findByEmail(String email) {
        return UserMapper.toResponse(userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email)));
    }

    @Override
    public UserResponse currentUser(String email) {
        return UserMapper.toResponse(findByEmailOrThrow(email));
    }

    @Override
    @Transactional
    public UserResponse updateProfile(String email, ProfileUpdateRequest request) {
        AppUser user = findByEmailOrThrow(email);
        ensureEmailIsAvailableForUpdate(request.email(), user.getId());
        user.setFullName(request.fullName());
        user.setEmail(request.email());
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
        ensureEmailIsAvailable(request.email());
        AppUser currentUser = findCurrentUser(currentUserEmail);
        ensureCanManageRole(currentUser, request.role());

        AppUser user = UserMapper.toEntity(request);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        if (currentUser != null) {
            user.setCreatedById(currentUser.getId());
        }
        user.setCreatedAt(Instant.now());
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
        ensureEmailIsAvailableForUpdate(request.email(), id);
        AppUser currentUser = findCurrentUser(currentUserEmail);
        ensureCanManageUser(currentUser, user);
        ensureCanManageRole(currentUser, request.role());
        ensureCurrentAdminRemainsActive(user, request.status(), currentUser);

        AppUser updatedUser = UserMapper.toEntity(request);
        user.setFullName(updatedUser.getFullName());
        user.setEmail(updatedUser.getEmail());
        user.setRole(updatedUser.getRole());
        user.setStatus(updatedUser.getStatus());
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
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private void ensureEmailIsAvailable(String email) {
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("User already exists with email: " + email);
        }
    }

    private void ensureEmailIsAvailableForUpdate(String email, Long userId) {
        if (userRepository.existsByEmailAndIdNot(email, userId)) {
            throw new DuplicateResourceException("User already exists with email: " + email);
        }
    }

    private AppUser findCurrentUser(String currentUserEmail) {
        if (currentUserEmail == null || currentUserEmail.isBlank()) {
            return null;
        }

        return userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Current user not found"));
    }

    private void ensureCanManageUser(AppUser currentUser, AppUser targetUser) {
        if (currentUser == null || currentUser.getRole() == Role.SUPER_ADMIN) {
            return;
        }

        if (currentUser.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("You do not have permission to perform this action");
        }

        if (targetUser.getRole() == Role.SUPER_ADMIN || targetUser.getId().equals(currentUser.getCreatedById())) {
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
