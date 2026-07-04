package com.nexus.platform.service;

import com.nexus.platform.dto.user.UserRequest;
import com.nexus.platform.dto.user.UserResponse;

import java.util.List;

public interface UserService {

    List<UserResponse> findAll();

    UserResponse findById(Long id);

    UserResponse findByEmail(String email);

    UserResponse create(UserRequest request);

    UserResponse update(Long id, UserRequest request);

    void delete(Long id);
}
