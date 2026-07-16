package com.nexus.platform.service;

import com.nexus.domain.entity.AppUser;
import com.nexus.domain.entity.MeasurementVariable;
import com.nexus.domain.entity.Station;
import com.nexus.domain.enums.MeasurementType;
import com.nexus.domain.enums.Role;
import com.nexus.domain.enums.UserStatus;
import com.nexus.platform.repository.FarmRepository;
import com.nexus.platform.repository.MeasurementVariableRepository;
import com.nexus.platform.repository.StationRepository;
import com.nexus.platform.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

class AccessControlServiceTest {

    private AccessControlService accessControlService;

    @BeforeEach
    void setUp() {
        accessControlService = new AccessControlService(
                mock(UserRepository.class),
                mock(FarmRepository.class),
                mock(StationRepository.class),
                mock(MeasurementVariableRepository.class)
        );
    }

    @Test
    void existingMeasurementTypePermissionStillWorks() {
        AppUser technician = user(Role.TECHNICIAN);
        technician.getAllowedMeasurementTypes().add(MeasurementType.AIR_TEMPERATURE);

        assertThatCode(() -> accessControlService.ensureMeasurementTypeAccess(technician, "AIR_TEMPERATURE"))
                .doesNotThrowAnyException();

        assertThatThrownBy(() -> accessControlService.ensureMeasurementTypeAccess(technician, "RAINFALL"))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void arbitraryDynamicCodeDoesNotParticipateInMeasurementTypeParsing() {
        Station station = station(10L);
        AppUser technician = user(Role.TECHNICIAN);
        technician.getStations().add(station);
        technician.getAllowedMeasurementTypes().add(MeasurementType.AIR_TEMPERATURE);

        MeasurementVariable variable = variable(100L, station, "TA_1_RAW_DAT_COLUMN", MeasurementType.AIR_TEMPERATURE);

        assertThat(accessControlService.canAccessMeasurementVariable(technician, variable)).isTrue();
    }

    @Test
    void nullMeasurementTypeIsHiddenForTechniciansAndViewers() {
        Station station = station(10L);
        AppUser viewer = user(Role.VIEWER);
        viewer.getStations().add(station);
        viewer.getAllowedMeasurementTypes().add(MeasurementType.AIR_TEMPERATURE);

        MeasurementVariable variable = variable(100L, station, "NEW_IMPORTED_COLUMN", null);

        assertThat(accessControlService.canAccessMeasurementVariable(viewer, variable)).isFalse();
        assertThatThrownBy(() -> accessControlService.ensureMeasurementVariableAccess(viewer, variable))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void directVariablePermissionAllowsImportedVariableWithoutMeasurementType() {
        Station station = station(10L);
        AppUser viewer = user(Role.VIEWER);
        viewer.getStations().add(station);
        MeasurementVariable variable = variable(100L, station, "NEW_IMPORTED_COLUMN", null);
        viewer.getMeasurementVariables().add(variable);

        assertThat(accessControlService.canAccessMeasurementVariable(viewer, variable)).isTrue();
    }

    @Test
    void techniciansAndViewersCannotBypassMeasurementTypePermissions() {
        Station station = station(10L);
        AppUser technician = user(Role.TECHNICIAN);
        technician.getStations().add(station);
        technician.getAllowedMeasurementTypes().add(MeasurementType.AIR_TEMPERATURE);

        MeasurementVariable variable = variable(100L, station, "RAIN_MM", MeasurementType.RAINFALL);

        assertThat(accessControlService.canAccessMeasurementVariable(technician, variable)).isFalse();
    }

    @Test
    void adminsAreLimitedToAssignedStationScopeButNotMeasurementTypeScope() {
        Station assignedStation = station(10L);
        Station otherStation = station(20L);
        AppUser admin = user(Role.ADMIN);
        admin.getStations().add(assignedStation);

        assertThat(accessControlService.canAccessMeasurementVariable(admin, variable(100L, assignedStation, "UNKNOWN", null))).isTrue();
        assertThat(accessControlService.canAccessMeasurementVariable(admin, variable(200L, otherStation, "UNKNOWN", null))).isFalse();
    }

    private static AppUser user(Role role) {
        return AppUser.builder()
                .id(1L)
                .fullName("Test User")
                .email("user@nexus.local")
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

    private static MeasurementVariable variable(Long id, Station station, String code, MeasurementType measurementType) {
        return MeasurementVariable.builder()
                .id(id)
                .station(station)
                .code(code)
                .measurementType(measurementType)
                .active(true)
                .createdAt(Instant.parse("2026-01-01T00:00:00Z"))
                .build();
    }
}
