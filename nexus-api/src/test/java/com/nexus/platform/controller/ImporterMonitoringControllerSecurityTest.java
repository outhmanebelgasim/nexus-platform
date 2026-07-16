package com.nexus.platform.controller;

import com.nexus.domain.entity.AppUser;
import com.nexus.domain.enums.Role;
import com.nexus.domain.enums.UserStatus;
import com.nexus.platform.dto.importer.ImporterStatusResponse;
import com.nexus.platform.security.JwtService;
import com.nexus.platform.service.ImporterMonitoringService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ImporterMonitoringControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private ImporterMonitoringService importerMonitoringService;

    @Test
    void superAdminAndAdminCanReadImporterStatus() throws Exception {
        when(importerMonitoringService.getStatus()).thenReturn(new ImporterStatusResponse(
                Instant.parse("2026-07-16T10:00:00Z"),
                Instant.parse("2026-07-16T09:00:00Z"),
                null,
                1L,
                0L,
                0L,
                2L,
                3L,
                4L,
                5L
        ));

        mockMvc.perform(get("/api/importer/status").header("Authorization", "Bearer " + token(Role.SUPER_ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.successCount").value(1));

        mockMvc.perform(get("/api/importer/status").header("Authorization", "Bearer " + token(Role.ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.measurementCount").value(5));
    }

    @Test
    void technicianViewerAndAnonymousCannotReadImporterMonitoring() throws Exception {
        mockMvc.perform(get("/api/importer/status").header("Authorization", "Bearer " + token(Role.TECHNICIAN)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/importer/status").header("Authorization", "Bearer " + token(Role.VIEWER)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/importer/status"))
                .andExpect(status().isUnauthorized());
    }

    private String token(Role role) {
        return jwtService.generateToken(AppUser.builder()
                .id(1L)
                .fullName(role.name())
                .email(role.name().toLowerCase() + "@nexus.local")
                .role(role)
                .status(UserStatus.ACTIVE)
                .createdAt(Instant.now())
                .passwordHash("unused")
                .build());
    }
}
