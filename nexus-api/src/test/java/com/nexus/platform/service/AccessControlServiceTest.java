package com.nexus.platform.service;

import com.nexus.domain.entity.AppUser;
import com.nexus.domain.entity.Farm;
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
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;

class AccessControlServiceTest {

    private FarmRepository farmRepository;
    private StationRepository stationRepository;
    private MeasurementVariableRepository measurementVariableRepository;
    private AccessControlService accessControlService;

    @BeforeEach
    void setUp() {
        farmRepository = mock(FarmRepository.class);
        stationRepository = mock(StationRepository.class);
        measurementVariableRepository = mock(MeasurementVariableRepository.class);
        accessControlService = new AccessControlService(
                mock(UserRepository.class),
                farmRepository,
                stationRepository,
                measurementVariableRepository
        );
    }

    @Test
    void viewerWithFarmAndOneExplicitStationCanOnlyAccessThatStation() {
        Farm yazid = farm(1L);
        Station etoYazid = station(10L, yazid);
        Station fosYazid = station(11L, yazid);
        Station mtoYazid = station(12L, yazid);
        AppUser viewer = user(Role.VIEWER);
        viewer.getFarms().add(yazid);
        viewer.getStations().add(mtoYazid);

        assertThat(accessControlService.accessibleStationIds(viewer)).containsExactly(12L);
        assertThatCode(() -> accessControlService.ensureStationAccess(viewer, mtoYazid.getId()))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> accessControlService.ensureStationAccess(viewer, etoYazid.getId()))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> accessControlService.ensureStationAccess(viewer, fosYazid.getId()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void viewerWithTwoExplicitStationsCanAccessExactlyThoseStations() {
        Farm yazid = farm(1L);
        Station fosYazid = station(11L, yazid);
        Station mtoYazid = station(12L, yazid);
        AppUser viewer = user(Role.VIEWER);
        viewer.getFarms().add(yazid);
        viewer.getStations().add(fosYazid);
        viewer.getStations().add(mtoYazid);

        assertThat(accessControlService.accessibleStationIds(viewer)).containsExactlyInAnyOrder(11L, 12L);
    }

    @Test
    void viewerWithFarmOnlyHasNoStationAccess() {
        AppUser viewer = user(Role.VIEWER);
        viewer.getFarms().add(farm(1L));

        assertThat(accessControlService.accessibleStationIds(viewer)).isEmpty();
    }

    @Test
    void superAdminStillHasAllStationAccess() {
        Station etoYazid = station(10L);
        Station fosYazid = station(11L);
        Station mtoYazid = station(12L);
        AppUser superAdmin = user(Role.SUPER_ADMIN);
        when(stationRepository.findAll()).thenReturn(List.of(etoYazid, fosYazid, mtoYazid));

        assertThat(accessControlService.accessibleStationIds(superAdmin)).containsExactlyInAnyOrder(10L, 11L, 12L);
    }

    @Test
    void explicitStationSelectionTakesPrecedenceOverFarmScopeForVariables() {
        Farm yazid = farm(1L);
        Station selectedStation = station(11L, yazid);
        Station unselectedStation = station(10L, yazid);
        MeasurementVariable variable = variable(100L, unselectedStation, "TA", MeasurementType.AIR_TEMPERATURE);
        AppUser target = user(Role.VIEWER);

        when(farmRepository.findAllById(Set.of(yazid.getId()))).thenReturn(List.of(yazid));
        when(stationRepository.findAllById(Set.of(selectedStation.getId()))).thenReturn(List.of(selectedStation));
        when(measurementVariableRepository.findByIdIn(Set.of(variable.getId()))).thenReturn(List.of(variable));

        assertThatThrownBy(() -> accessControlService.assignAccess(
                null,
                target,
                Set.of(yazid.getId()),
                Set.of(selectedStation.getId()),
                Set.of(variable.getId()),
                Set.of(MeasurementType.AIR_TEMPERATURE)
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Measurement variable access must belong to the selected station scope");
    }

    @Test
    void farmScopeIsUsedForVariablesOnlyWhenNoExplicitStationsAreSelected() {
        Farm yazid = farm(1L);
        Station farmStation = station(10L, yazid);
        MeasurementVariable variable = variable(100L, farmStation, "TA", MeasurementType.AIR_TEMPERATURE);
        AppUser target = user(Role.VIEWER);

        when(farmRepository.findAllById(Set.of(yazid.getId()))).thenReturn(List.of(yazid));
        when(stationRepository.findAllById(Set.of())).thenReturn(List.of());
        when(stationRepository.findAll()).thenReturn(List.of(farmStation));
        when(measurementVariableRepository.findByIdIn(Set.of(variable.getId()))).thenReturn(List.of(variable));

        accessControlService.assignAccess(
                null,
                target,
                Set.of(yazid.getId()),
                Set.of(),
                Set.of(variable.getId()),
                Set.of(MeasurementType.AIR_TEMPERATURE)
        );

        assertThat(target.getMeasurementVariables()).extracting(MeasurementVariable::getId).containsExactly(variable.getId());
    }

    @Test
    void assignAccessReplacesDeselectedStations() {
        Farm yazid = farm(1L);
        Station removedStation = station(10L, yazid);
        Station remainingStation = station(11L, yazid);
        AppUser target = user(Role.VIEWER);
        target.getStations().add(removedStation);
        target.getStations().add(remainingStation);

        when(farmRepository.findAllById(Set.of(yazid.getId()))).thenReturn(List.of(yazid));
        when(stationRepository.findAllById(Set.of(remainingStation.getId()))).thenReturn(List.of(remainingStation));
        when(measurementVariableRepository.findByIdIn(Set.of())).thenReturn(List.of());

        accessControlService.assignAccess(
                null,
                target,
                Set.of(yazid.getId()),
                Set.of(remainingStation.getId()),
                Set.of(),
                Set.of()
        );

        assertThat(target.getStations()).extracting(Station::getId).containsExactly(remainingStation.getId());
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

    private static Farm farm(Long id) {
        return Farm.builder()
                .id(id)
                .name("Farm " + id)
                .createdAt(Instant.parse("2026-01-01T00:00:00Z"))
                .build();
    }

    private static Station station(Long id) {
        return station(id, null);
    }

    private static Station station(Long id, Farm farm) {
        return Station.builder()
                .id(id)
                .farm(farm)
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
