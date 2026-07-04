package com.nexus.platform.service.impl;

import com.nexus.domain.entity.AppUser;
import com.nexus.platform.dto.user.UserRequest;
import com.nexus.platform.dto.user.UserResponse;
import com.nexus.platform.mapper.UserMapper;
import com.nexus.platform.repository.UserRepository;
import com.nexus.platform.service.UserService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

    public UserServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
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
                .orElseThrow(() -> new EntityNotFoundException("User not found with email: " + email)));
    }

    @Override
    @Transactional
    public UserResponse create(UserRequest request) {
        ensureEmailIsAvailable(request.email());

        AppUser user = UserMapper.toEntity(request);
        user.setCreatedAt(Instant.now());
        return UserMapper.toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserResponse update(Long id, UserRequest request) {
        AppUser user = findUserById(id);
        ensureEmailIsAvailableForUpdate(request.email(), id);

        AppUser updatedUser = UserMapper.toEntity(request);
        user.setFullName(updatedUser.getFullName());
        user.setEmail(updatedUser.getEmail());
        user.setRole(updatedUser.getRole());
        user.setEnabled(updatedUser.getEnabled());
        user.setUpdatedAt(Instant.now());

        return UserMapper.toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        AppUser user = findUserById(id);
        userRepository.delete(user);
    }

    private AppUser findUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id: " + id));
    }

    private void ensureEmailIsAvailable(String email) {
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("User already exists with email: " + email);
        }
    }

    private void ensureEmailIsAvailableForUpdate(String email, Long userId) {
        userRepository.findByEmail(email)
                .filter(existingUser -> !existingUser.getId().equals(userId))
                .ifPresent(existingUser -> {
                    throw new IllegalArgumentException("User already exists with email: " + email);
                });
    }
}
