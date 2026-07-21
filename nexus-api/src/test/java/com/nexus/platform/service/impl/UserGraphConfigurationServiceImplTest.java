package com.nexus.platform.service.impl;

import com.nexus.domain.entity.AppUser;
import com.nexus.domain.entity.MeasurementVariable;
import com.nexus.domain.entity.Station;
import com.nexus.domain.entity.UserGraphConfiguration;
import com.nexus.domain.entity.UserGraphVariable;
import com.nexus.domain.enums.Role;
import com.nexus.domain.enums.StationCategory;
import com.nexus.domain.enums.UserStatus;
import com.nexus.platform.dto.graph.UserGraphConfigurationRequest;
import com.nexus.platform.dto.graph.UserGraphVariableRequest;
import com.nexus.platform.repository.MeasurementRepository;
import com.nexus.platform.repository.MeasurementVariableRepository;
import com.nexus.platform.repository.StationRepository;
import com.nexus.platform.repository.UserGraphConfigurationRepository;
import com.nexus.platform.repository.UserRepository;
import com.nexus.platform.service.AccessControlService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserGraphConfigurationServiceImplTest {

    private UserGraphConfigurationRepository graphRepository;
    private UserRepository userRepository;
    private StationRepository stationRepository;
    private MeasurementVariableRepository measurementVariableRepository;
    private MeasurementRepository measurementRepository;
    private AccessControlService accessControlService;
    private UserGraphConfigurationServiceImpl service;

    @BeforeEach
    void setUp() {
        graphRepository = mock(UserGraphConfigurationRepository.class);
        userRepository = mock(UserRepository.class);
        stationRepository = mock(StationRepository.class);
        measurementVariableRepository = mock(MeasurementVariableRepository.class);
        measurementRepository = mock(MeasurementRepository.class);
        accessControlService = mock(AccessControlService.class);
        service = new UserGraphConfigurationServiceImpl(
                graphRepository,
                userRepository,
                stationRepository,
                measurementVariableRepository,
                measurementRepository,
                accessControlService
        );
    }

    @Test
    void createStoresStationAndStationSpecificVariableIds() {
        AppUser admin = user(Role.ADMIN, 1L, "admin@nexus.local");
        AppUser viewer = user();
        Station station = station(17L, "ET0_YAZID", StationCategory.METEO);
        MeasurementVariable variable = variable(101L, station, "Cumul_Et0");
        viewer.getStations().add(station);

        when(accessControlService.findUserByEmail(admin.getEmail())).thenReturn(admin);
        when(userRepository.findById(viewer.getId())).thenReturn(Optional.of(viewer));
        when(stationRepository.findById(station.getId())).thenReturn(Optional.of(station));
        when(stationRepository.getReferenceById(station.getId())).thenReturn(station);
        when(measurementVariableRepository.findByStationIdAndIdIn(station.getId(), List.of(variable.getId()))).thenReturn(List.of(variable));
        when(measurementVariableRepository.getReferenceById(variable.getId())).thenReturn(variable);
        when(accessControlService.canAccessMeasurementVariable(admin, variable)).thenReturn(true);
        doAnswer(invocation -> invocation.getArgument(0)).when(graphRepository).save(any(UserGraphConfiguration.class));

        var response = service.create(viewer.getId(), request(station, variable), admin.getEmail());

        assertThat(response.stationId()).isEqualTo(station.getId());
        assertThat(response.variables()).extracting("variableId").containsExactly(variable.getId());
        verify(accessControlService).ensureStationAccess(admin, station.getId());
    }

    @Test
    void createRejectsVariableFromAnotherStation() {
        AppUser admin = user(Role.SUPER_ADMIN, 1L, "admin@nexus.local");
        AppUser viewer = user();
        Station selectedStation = station(17L, "ET0_YAZID", StationCategory.METEO);
        Station otherStation = station(18L, "MTO_YAZID", StationCategory.METEO);
        MeasurementVariable otherVariable = variable(201L, otherStation, "Temperature");
        viewer.getStations().add(selectedStation);

        when(accessControlService.findUserByEmail(admin.getEmail())).thenReturn(admin);
        when(userRepository.findById(viewer.getId())).thenReturn(Optional.of(viewer));
        when(stationRepository.findById(selectedStation.getId())).thenReturn(Optional.of(selectedStation));
        when(measurementVariableRepository.findByStationIdAndIdIn(selectedStation.getId(), List.of(otherVariable.getId()))).thenReturn(List.of());

        assertThatThrownBy(() -> service.create(viewer.getId(), request(selectedStation, otherVariable), admin.getEmail()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Graph variables must belong to the selected station");
    }

    @Test
    void currentStationGraphConfigurationsReturnsOnlyGraphsForRequestedStation() {
        AppUser viewer = user();
        Station et0 = station(17L, "ET0_YAZID", StationCategory.METEO);
        UserGraphConfiguration et0Graph = graph(viewer);
        et0Graph.setStation(et0);
        viewer.getStations().add(et0);

        when(accessControlService.findUserByEmail(viewer.getEmail())).thenReturn(viewer);
        when(stationRepository.findById(et0.getId())).thenReturn(Optional.of(et0));
        when(graphRepository.findByUserIdAndStationIdAndActiveTrueOrderByDisplayOrderAscIdAsc(viewer.getId(), et0.getId()))
                .thenReturn(List.of(et0Graph));

        var graphs = service.currentStationGraphConfigurations(et0.getId(), viewer.getEmail());

        assertThat(graphs).hasSize(1);
        assertThat(graphs.getFirst().stationId()).isEqualTo(et0.getId());
        verify(graphRepository).findByUserIdAndStationIdAndActiveTrueOrderByDisplayOrderAscIdAsc(viewer.getId(), et0.getId());
        verify(graphRepository, never()).findByUserIdAndStationCategoryAndActiveTrueOrderByDisplayOrderAscIdAsc(eq(viewer.getId()), any());
    }

    @Test
    void currentGraphMeasurementsReturnsEmptyPayloadWhenConfiguredVariableIsMissingForSelectedStation() {
        AppUser viewer = user();
        Station station = Station.builder()
                .id(17L)
                .code("MTO_YAZID")
                .name("MTO YAZID")
                .stationCategory(StationCategory.METEO)
                .build();
        UserGraphConfiguration graph = graph(viewer);
        MeasurementVariable resolvedVariable = MeasurementVariable.builder()
                .id(101L)
                .station(station)
                .code("Temperature")
                .displayName("Temperature")
                .unit("C")
                .active(true)
                .build();

        when(accessControlService.findUserByEmail(viewer.getEmail())).thenReturn(viewer);
        when(stationRepository.findById(17L)).thenReturn(Optional.of(station));
        when(graphRepository.findByIdAndUserIdAndStationId(55L, viewer.getId(), 17L)).thenReturn(Optional.of(graph));
        when(measurementVariableRepository.findByStationIdAndIdIn(17L, List.of(101L, 102L)))
                .thenReturn(List.of(resolvedVariable));

        var response = service.currentGraphMeasurements(17L, 55L, "LAST_MONTH", viewer.getEmail());

        assertThat(response.graph().id()).isEqualTo(55L);
        assertThat(response.measurements()).isEmpty();
        assertThat(response.variables()).hasSize(1);
        assertThat(response.aggregationNote()).isEqualTo("One or more configured variables do not exist for the selected station.");
        verify(measurementRepository, never()).findByMeasurementVariableStationIdAndMeasurementVariableIdInAndIdMeasuredAtBetweenOrderByIdMeasuredAtAsc(
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any()
        );
    }

    private static AppUser user() {
        return user(Role.VIEWER, 9L, "viewer@nexus.local");
    }

    private static AppUser user(Role role, Long id, String email) {
        return AppUser.builder()
                .id(id)
                .fullName(role.name())
                .email(email)
                .passwordHash("hash")
                .role(role)
                .status(UserStatus.ACTIVE)
                .createdAt(Instant.parse("2026-01-01T00:00:00Z"))
                .build();
    }

    private static UserGraphConfiguration graph(AppUser viewer) {
        UserGraphConfiguration graph = UserGraphConfiguration.builder()
                .id(55L)
                .user(viewer)
                .title("Air")
                .stationCategory(StationCategory.METEO)
                .yAxisMin(BigDecimal.ZERO)
                .yAxisMax(BigDecimal.valueOf(100))
                .displayOrder(1)
                .active(true)
                .createdAt(Instant.parse("2026-01-01T00:00:00Z"))
                .build();
        graph.getVariables().add(UserGraphVariable.builder()
                .graphConfiguration(graph)
                .measurementVariable(MeasurementVariable.builder().id(101L).code("Temperature").build())
                .variableCode("Temperature")
                .displayOrder(1)
                .build());
        graph.getVariables().add(UserGraphVariable.builder()
                .graphConfiguration(graph)
                .measurementVariable(MeasurementVariable.builder().id(102L).code("Humidity").build())
                .variableCode("Humidity")
                .displayOrder(2)
                .build());
        return graph;
    }

    private static Station station(Long id, String code, StationCategory category) {
        return Station.builder()
                .id(id)
                .code(code)
                .name(code)
                .stationCategory(category)
                .build();
    }

    private static MeasurementVariable variable(Long id, Station station, String code) {
        return MeasurementVariable.builder()
                .id(id)
                .station(station)
                .code(code)
                .displayName(code)
                .unit("mm")
                .active(true)
                .build();
    }

    private static UserGraphConfigurationRequest request(Station station, MeasurementVariable variable) {
        return new UserGraphConfigurationRequest(
                "ET0 cumulative",
                null,
                station.getId(),
                station.getStationCategory(),
                BigDecimal.ZERO,
                BigDecimal.valueOf(100),
                1,
                true,
                List.of(new UserGraphVariableRequest(variable.getId(), variable.getCode(), 1))
        );
    }
}
