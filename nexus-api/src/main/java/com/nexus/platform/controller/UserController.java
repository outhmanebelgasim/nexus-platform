package com.nexus.platform.controller;

import com.nexus.platform.dto.user.PasswordUpdateRequest;
import com.nexus.platform.dto.user.ProfileUpdateRequest;
import com.nexus.platform.dto.user.UserRequest;
import com.nexus.platform.dto.user.UserPermissionsResponse;
import com.nexus.platform.dto.user.UserResponse;
import com.nexus.platform.dto.user.UserStatusRequest;
import com.nexus.platform.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<UserResponse>> findAll(Authentication authentication) {
        return ResponseEntity.ok(userService.findAll(authentication.getName()));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> currentUser(Authentication authentication) {
        return ResponseEntity.ok(userService.currentUser(authentication.getName()));
    }

    @GetMapping("/me/permissions")
    public ResponseEntity<UserPermissionsResponse> currentUserPermissions(Authentication authentication) {
        return ResponseEntity.ok(userService.currentUserPermissions(authentication.getName()));
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateProfile(
            @Valid @RequestBody ProfileUpdateRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(userService.updateProfile(authentication.getName(), request));
    }

    @PutMapping("/me/password")
    public ResponseEntity<Void> updatePassword(
            @Valid @RequestBody PasswordUpdateRequest request,
            Authentication authentication
    ) {
        userService.updatePassword(authentication.getName(), request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> findById(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(userService.findById(id, authentication.getName()));
    }

    @GetMapping("/search")
    public ResponseEntity<UserResponse> findByEmail(@RequestParam String email, Authentication authentication) {
        return ResponseEntity.ok(userService.findByEmail(email, authentication.getName()));
    }

    @PostMapping
    public ResponseEntity<UserResponse> create(@Valid @RequestBody UserRequest request, Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.create(request, authentication.getName()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UserRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(userService.update(id, request, authentication.getName()));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<UserResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UserStatusRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(userService.updateStatus(id, request.status(), authentication.getName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication authentication) {
        userService.delete(id, authentication.getName());
        return ResponseEntity.noContent().build();
    }
}
