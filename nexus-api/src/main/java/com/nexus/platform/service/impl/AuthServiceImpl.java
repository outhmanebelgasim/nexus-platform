package com.nexus.platform.service.impl;

import com.nexus.domain.entity.AppUser;
import com.nexus.domain.enums.Role;
import com.nexus.domain.enums.UserStatus;
import com.nexus.platform.dto.auth.LoginRequest;
import com.nexus.platform.dto.auth.LoginResponse;
import com.nexus.platform.dto.auth.RegisterRequest;
import com.nexus.platform.dto.user.UserResponse;
import com.nexus.platform.exception.DuplicateResourceException;
import com.nexus.platform.exception.ResourceNotFoundException;
import com.nexus.platform.mapper.UserMapper;
import com.nexus.platform.repository.UserRepository;
import com.nexus.platform.security.JwtService;
import com.nexus.platform.service.AuthService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@Transactional(readOnly = true)
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthServiceImpl(
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        AppUser user = findByEmail(request.email());
        return new LoginResponse(jwtService.generateToken(user), UserMapper.toResponse(user));
    }

    @Override
    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (!request.password().equals(request.confirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match.");
        }

        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("Email already exists.");
        }

        AppUser user = AppUser.builder()
                .fullName(request.fullName())
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(Role.VIEWER)
                .status(UserStatus.ACTIVE)
                .createdAt(Instant.now())
                .build();

        return UserMapper.toResponse(userRepository.save(user));
    }

    @Override
    public UserResponse currentUser(String email) {
        return UserMapper.toResponse(findByEmail(email));
    }

    private AppUser findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
