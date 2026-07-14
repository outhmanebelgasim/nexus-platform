package com.nexus.platform.service.impl;

import com.nexus.domain.entity.AppUser;
import com.nexus.domain.entity.MeasurementVariable;
import com.nexus.domain.entity.Station;
import com.nexus.domain.enums.MeasurementType;
import com.nexus.domain.enums.Role;
import com.nexus.domain.enums.UserStatus;
import com.nexus.platform.dto.measurementvariable.MeasurementVariableRequest;
import com.nexus.platform.repository.MeasurementVariableRepository;
import com.nexus.platform.repository.StationRepository;
import com.nexus.platform.service.AccessControlService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MeasurementVariableServiceImplTest {

    private MeasurementVariableRepository measurementVariableRepository;
    private AccessControlService accessControlService;
    private MeasurementVariableServiceImpl service;

    @BeforeEach
    void setUp() {
        measurementVariableRepository = mock(MeasurementVariableRepository.class);
        accessControlService = mock(AccessControlService.class);
        service = new MeasurementVariableServiceImpl(
                measurementVariableRepository,
                mock(StationRepository.class),
                accessControlService
        );
    }

    @Test
    void adminCanUpdateMetadataAndMeasurementTypeWithinStationScope() {
        AppUser admin = user(Role.ADMIN);
        MeasurementVariable variable = variable(100L, station(10L), null);
        MeasurementVariableRequest request = new MeasurementVariableRequest(
                "Air temperature",
                "C",
                "Canopy sensor",
                false,
                MeasurementType.AIR_TEMPERATURE
        );

        when(measurementVariableRepository.findById(variable.getId())).thenReturn(Optional.of(variable));
        when(accessControlService.findUserByEmail(admin.getEmail())).thenReturn(admin);
        when(measurementVariableRepository.save(variable)).thenReturn(variable);

        assertThat(service.update(variable.getId(), request, admin.getEmail()).measurementType())
                .isEqualTo(MeasurementType.AIR_TEMPERATURE);

        verify(accessControlService).ensureStationAccess(admin, variable.getStation().getId());
        assertThat(variable.isActive()).isFalse();
        assertThat(variable.getDisplayName()).isEqualTo("Air temperature");
    }

    @Test
    void adminCannotUpdateVariablesOutsideStationScope() {
        AppUser admin = user(Role.ADMIN);
        MeasurementVariable variable = variable(100L, station(10L), null);
        MeasurementVariableRequest request = new MeasurementVariableRequest(null, null, null, true, MeasurementType.RAINFALL);

        when(measurementVariableRepository.findById(variable.getId())).thenReturn(Optional.of(variable));
        when(accessControlService.findUserByEmail(admin.getEmail())).thenReturn(admin);
        doThrow(new AccessDeniedException("Denied"))
                .when(accessControlService)
                .ensureStationAccess(admin, variable.getStation().getId());

        assertThatThrownBy(() -> service.update(variable.getId(), request, admin.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    private static AppUser user(Role role) {
        return AppUser.builder()
                .id(1L)
                .fullName("Test User")
                .email("admin@nexus.local")
                .passwordHash("hash")
                .role(role)
                .status(UserStatus.ACTIVE)
                .createdAt(Instant.parse("2026-01-01T00:00:00Z"))
                .build();
    }

    private static Station station(Long id) {
        return Station.builder()
                .id(id)
                .name("Station " + id)
                .code("ST-" + id)
                .createdAt(Instant.parse("2026-01-01T00:00:00Z"))
                .build();
    }

    private static MeasurementVariable variable(Long id, Station station, MeasurementType measurementType) {
        return MeasurementVariable.builder()
                .id(id)
                .station(station)
                .code("DYNAMIC_COLUMN")
                .measurementType(measurementType)
                .active(true)
                .createdAt(Instant.parse("2026-01-01T00:00:00Z"))
                .build();
    }
}
