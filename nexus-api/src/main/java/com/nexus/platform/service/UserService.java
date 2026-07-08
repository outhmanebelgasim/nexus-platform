package com.nexus.platform.service;

import com.nexus.platform.dto.user.UserRequest;
import com.nexus.platform.dto.user.UserResponse;
import com.nexus.domain.enums.UserStatus;
import com.nexus.platform.dto.user.PasswordUpdateRequest;
import com.nexus.platform.dto.user.ProfileUpdateRequest;

import java.util.List;

public interface UserService {

    List<UserResponse> findAll();

    UserResponse findById(Long id);

    UserResponse findByEmail(String email);

    UserResponse currentUser(String email);

    UserResponse updateProfile(String email, ProfileUpdateRequest request);

    void updatePassword(String email, PasswordUpdateRequest request);

    UserResponse create(UserRequest request);

    UserResponse create(UserRequest request, String currentUserEmail);

    UserResponse update(Long id, UserRequest request);

    UserResponse update(Long id, UserRequest request, String currentUserEmail);

    UserResponse updateStatus(Long id, UserStatus status, String currentUserEmail);

    void delete(Long id, String currentUserEmail);
}
