package com.nexus.platform.service.impl;

import com.nexus.domain.entity.AppUser;
import com.nexus.domain.enums.Role;
import com.nexus.domain.enums.UserStatus;
import com.nexus.platform.repository.MeasurementRepository;
import com.nexus.platform.repository.MeasurementVariableRepository;
import com.nexus.platform.service.AccessControlService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MeasurementServiceImplTest {

    private MeasurementRepository measurementRepository;
    private MeasurementVariableRepository measurementVariableRepository;
    private AccessControlService accessControlService;
    private MeasurementServiceImpl measurementService;

    @BeforeEach
    void setUp() {
        measurementRepository = mock(MeasurementRepository.class);
        measurementVariableRepository = mock(MeasurementVariableRepository.class);
        accessControlService = mock(AccessControlService.class);
        measurementService = new MeasurementServiceImpl(
                measurementRepository,
                measurementVariableRepository,
                accessControlService
        );
    }

    @Test
    void viewerDirectlyQueryingUnauthorizedStationIsDenied() {
        AppUser viewer = user(Role.VIEWER);
        Long unauthorizedStationId = 11L;
        when(accessControlService.findUserByEmail(viewer.getEmail())).thenReturn(viewer);
        org.mockito.Mockito.doThrow(new AccessDeniedException("You do not have permission to access this station"))
                .when(accessControlService)
                .ensureStationAccess(viewer, unauthorizedStationId);

        assertThatThrownBy(() -> measurementService.findByStationIdAndVariablesAndTimeBetween(
                unauthorizedStationId,
                List.of(100L),
                Instant.parse("2026-01-01T00:00:00Z"),
                Instant.parse("2026-01-02T00:00:00Z"),
                viewer.getEmail()
        )).isInstanceOf(AccessDeniedException.class);

        verify(measurementVariableRepository, never()).findByStationIdAndIdIn(anyLong(), any());
        verify(measurementRepository, never()).findByMeasurementVariableStationIdAndMeasurementVariableIdInAndIdMeasuredAtBetweenOrderByIdMeasuredAtAsc(
                anyLong(),
                any(),
                any(),
                any()
        );
    }

    private static AppUser user(Role role) {
        return AppUser.builder()
                .id(1L)
                .fullName("Test User")
                .email("viewer@nexus.local")
                .passwordHash("hash")
                .role(role)
                .status(UserStatus.ACTIVE)
                .createdAt(Instant.parse("2026-01-01T00:00:00Z"))
                .build();
    }
}
