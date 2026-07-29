package com.nexus.platform.service.impl;

import com.nexus.domain.entity.AppUser;
import com.nexus.domain.entity.MeasurementVariable;
import com.nexus.domain.entity.Station;
import com.nexus.domain.entity.UserGraphConfiguration;
import com.nexus.domain.entity.UserGraphVariable;
import com.nexus.domain.enums.GraphAxis;
import com.nexus.domain.enums.MeasurementQuality;
import com.nexus.domain.enums.Role;
import com.nexus.domain.enums.StationCategory;
import com.nexus.platform.dto.graph.RestrictedGraphMeasurementResponse;
import com.nexus.platform.dto.graph.UserGraphConfigurationRequest;
import com.nexus.platform.dto.graph.UserGraphConfigurationResponse;
import com.nexus.platform.dto.graph.UserGraphVariableResponse;
import com.nexus.platform.dto.measurement.MeasurementResponse;
import com.nexus.platform.dto.station.StationResponse;
import com.nexus.platform.exception.ResourceNotFoundException;
import com.nexus.platform.mapper.MeasurementMapper;
import com.nexus.platform.mapper.MeasurementVariableMapper;
import com.nexus.platform.mapper.StationMapper;
import com.nexus.platform.repository.MeasurementRepository;
import com.nexus.platform.repository.MeasurementVariableRepository;
import com.nexus.platform.repository.StationRepository;
import com.nexus.platform.repository.UserGraphConfigurationRepository;
import com.nexus.platform.repository.UserRepository;
import com.nexus.platform.service.AccessControlService;
import com.nexus.platform.service.UserGraphConfigurationService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.Duration;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class UserGraphConfigurationServiceImpl implements UserGraphConfigurationService {

    private static final Set<Role> RESTRICTED_ROLES = Set.of(Role.TECHNICIAN, Role.VIEWER);

    private final UserGraphConfigurationRepository graphRepository;
    private final UserRepository userRepository;
    private final StationRepository stationRepository;
    private final MeasurementVariableRepository measurementVariableRepository;
    private final MeasurementRepository measurementRepository;
    private final AccessControlService accessControlService;

    public UserGraphConfigurationServiceImpl(
            UserGraphConfigurationRepository graphRepository,
            UserRepository userRepository,
            StationRepository stationRepository,
            MeasurementVariableRepository measurementVariableRepository,
            MeasurementRepository measurementRepository,
            AccessControlService accessControlService
    ) {
        this.graphRepository = graphRepository;
        this.userRepository = userRepository;
        this.stationRepository = stationRepository;
        this.measurementVariableRepository = measurementVariableRepository;
        this.measurementRepository = measurementRepository;
        this.accessControlService = accessControlService;
    }

    @Override
    public List<UserGraphConfigurationResponse> findForUser(Long userId, String currentUserEmail) {
        AppUser actor = accessControlService.findUserByEmail(currentUserEmail);
        AppUser target = findUser(userId);
        ensureCanManage(actor, target);
        return graphRepository.findByUserIdOrderByDisplayOrderAscIdAsc(userId).stream()
                .map(graph -> toResponse(graph, List.of()))
                .toList();
    }

    @Override
    @Transactional
    public UserGraphConfigurationResponse create(Long userId, UserGraphConfigurationRequest request, String currentUserEmail) {
        AppUser actor = accessControlService.findUserByEmail(currentUserEmail);
        AppUser target = findUser(userId);
        ensureCanManage(actor, target);
        validateRequest(actor, target, request);

        UserGraphConfiguration graph = UserGraphConfiguration.builder()
                .user(target)
                .station(stationRepository.getReferenceById(request.stationId()))
                .title(request.title().trim())
                .description(trimToNull(request.description()))
                .stationCategory(request.stationCategory())
                .yAxisMin(request.yAxisMin())
                .yAxisMax(request.yAxisMax())
                .primaryAxisLabel(trimToNull(request.primaryAxisLabel()))
                .primaryAxisUnit(trimToNull(request.primaryAxisUnit()))
                .secondaryAxisEnabled(request.secondaryAxisEnabled())
                .secondaryAxisLabel(trimToNull(request.secondaryAxisLabel()))
                .secondaryAxisUnit(trimToNull(request.secondaryAxisUnit()))
                .secondaryAxisMin(request.secondaryAxisMin())
                .secondaryAxisMax(request.secondaryAxisMax())
                .displayOrder(request.displayOrder())
                .active(request.active())
                .createdAt(Instant.now())
                .createdBy(actor)
                .build();
        replaceVariables(graph, request);
        return toResponse(graphRepository.save(graph), List.of());
    }

    @Override
    @Transactional
    public UserGraphConfigurationResponse update(Long userId, Long graphId, UserGraphConfigurationRequest request, String currentUserEmail) {
        AppUser actor = accessControlService.findUserByEmail(currentUserEmail);
        AppUser target = findUser(userId);
        ensureCanManage(actor, target);
        validateRequest(actor, target, request);
        UserGraphConfiguration graph = graphRepository.findByIdAndUserId(graphId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Graph configuration not found"));

        graph.setTitle(request.title().trim());
        graph.setDescription(trimToNull(request.description()));
        graph.setStation(stationRepository.getReferenceById(request.stationId()));
        graph.setStationCategory(request.stationCategory());
        graph.setYAxisMin(request.yAxisMin());
        graph.setYAxisMax(request.yAxisMax());
        graph.setPrimaryAxisLabel(trimToNull(request.primaryAxisLabel()));
        graph.setPrimaryAxisUnit(trimToNull(request.primaryAxisUnit()));
        graph.setSecondaryAxisEnabled(request.secondaryAxisEnabled());
        graph.setSecondaryAxisLabel(trimToNull(request.secondaryAxisLabel()));
        graph.setSecondaryAxisUnit(trimToNull(request.secondaryAxisUnit()));
        graph.setSecondaryAxisMin(request.secondaryAxisMin());
        graph.setSecondaryAxisMax(request.secondaryAxisMax());
        graph.setDisplayOrder(request.displayOrder());
        graph.setActive(request.active());
        graph.setUpdatedAt(Instant.now());
        replaceVariables(graph, request);
        return toResponse(graphRepository.save(graph), List.of());
    }

    @Override
    @Transactional
    public void delete(Long userId, Long graphId, String currentUserEmail) {
        AppUser actor = accessControlService.findUserByEmail(currentUserEmail);
        AppUser target = findUser(userId);
        ensureCanManage(actor, target);
        UserGraphConfiguration graph = graphRepository.findByIdAndUserId(graphId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Graph configuration not found"));
        graphRepository.delete(graph);
    }

    @Override
    @Transactional
    public List<UserGraphConfigurationResponse> reorder(Long userId, List<Long> graphIds, String currentUserEmail) {
        AppUser actor = accessControlService.findUserByEmail(currentUserEmail);
        AppUser target = findUser(userId);
        ensureCanManage(actor, target);
        List<UserGraphConfiguration> graphs = graphRepository.findByUserIdOrderByDisplayOrderAscIdAsc(userId);
        Map<Long, UserGraphConfiguration> graphById = graphs.stream().collect(Collectors.toMap(UserGraphConfiguration::getId, Function.identity()));
        if (!graphById.keySet().equals(new LinkedHashSet<>(graphIds))) {
            throw new IllegalArgumentException("Reorder request must include every graph exactly once");
        }
        for (int index = 0; index < graphIds.size(); index++) {
            graphById.get(graphIds.get(index)).setDisplayOrder(index + 1);
        }
        return graphs.stream().sorted(Comparator.comparing(UserGraphConfiguration::getDisplayOrder)).map(graph -> toResponse(graph, List.of())).toList();
    }

    @Override
    public List<StationCategory> currentStationCategories(String currentUserEmail) {
        AppUser user = accessControlService.findUserByEmail(currentUserEmail);
        return user.getStations().stream()
                .map(Station::getStationCategory)
                .filter(category -> category != null && user.getStations().stream()
                        .filter(station -> station.getStationCategory() == category)
                        .anyMatch(station -> graphRepository.existsActiveByUserIdAndStationId(user.getId(), station.getId())))
                .distinct()
                .sorted()
                .toList();
    }

    @Override
    public List<StationResponse> currentStations(StationCategory category, String currentUserEmail) {
        AppUser user = accessControlService.findUserByEmail(currentUserEmail);
        if (accessControlService.hasUnrestrictedAccess(user)) {
            return StationMapper.toResponseList(stationRepository.findAll().stream()
                    .filter(station -> station.getStationCategory() == category)
                    .sorted(Comparator.comparing(Station::getName).thenComparing(Station::getCode))
                    .toList());
        }
        List<Long> stationIds = user.getStations().stream().map(Station::getId).toList();
        if (stationIds.isEmpty()) {
            return List.of();
        }
        return StationMapper.toResponseList(stationRepository.findByIdInAndStationCategoryOrderByNameAscCodeAsc(stationIds, category));
    }

    @Override
    public List<UserGraphConfigurationResponse> currentGraphConfigurations(StationCategory category, String currentUserEmail) {
        AppUser user = accessControlService.findUserByEmail(currentUserEmail);
        if (!RESTRICTED_ROLES.contains(user.getRole())) {
            return List.of();
        }
        return graphRepository.findByUserIdAndStationCategoryAndActiveTrueOrderByDisplayOrderAscIdAsc(user.getId(), category).stream()
                .map(graph -> toResponse(graph, List.of()))
                .toList();
    }

    @Override
    public List<UserGraphConfigurationResponse> currentStationGraphConfigurations(Long stationId, String currentUserEmail) {
        AppUser user = accessControlService.findUserByEmail(currentUserEmail);
        if (!RESTRICTED_ROLES.contains(user.getRole())) {
            return List.of();
        }
        accessControlService.ensureStationAccess(user, stationId);
        Station station = stationRepository.findById(stationId)
                .orElseThrow(() -> new ResourceNotFoundException("Station not found with id: " + stationId));
        if (station.getStationCategory() == null) {
            return List.of();
        }
        return graphRepository.findByUserIdAndStationIdAndActiveTrueOrderByDisplayOrderAscIdAsc(user.getId(), stationId).stream()
                .map(graph -> toResponse(graph, List.of()))
                .toList();
    }

    @Override
    public RestrictedGraphMeasurementResponse currentGraphMeasurements(Long stationId, Long graphId, String range, String currentUserEmail) {
        AppUser user = accessControlService.findUserByEmail(currentUserEmail);
        accessControlService.ensureStationAccess(user, stationId);
        Station station = stationRepository.findById(stationId).orElseThrow(() -> new ResourceNotFoundException("Station not found with id: " + stationId));
        UserGraphConfiguration graph = graphRepository.findByIdAndUserIdAndStationId(graphId, user.getId(), stationId)
                .filter(UserGraphConfiguration::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Graph configuration not found"));
        if (station.getStationCategory() != graph.getStationCategory()) {
            throw new AccessDeniedException("Graph category does not match the selected station");
        }

        List<Long> configuredVariableIds = graph.getVariables().stream()
                .map(UserGraphVariable::getMeasurementVariable)
                .filter(variable -> variable != null)
                .map(MeasurementVariable::getId)
                .toList();
        List<MeasurementVariable> variables = measurementVariableRepository.findByStationIdAndIdIn(stationId, configuredVariableIds);
        if (configuredVariableIds.isEmpty() || variables.size() != configuredVariableIds.size()) {
            return new RestrictedGraphMeasurementResponse(
                    toResponse(graph, variables),
                    MeasurementVariableMapper.toResponseList(variables),
                    List.of(),
                    false,
                    "One or more configured variables do not exist for the selected station.",
                    null,
                    null,
                    null
            );
        }
        List<Long> variableIds = variables.stream().map(MeasurementVariable::getId).toList();
        String normalizedRange = range == null ? "LAST_MONTH" : range.trim().toUpperCase(Locale.ROOT);
        GraphMeasurementPayload payload = switch (normalizedRange) {
            case "ALL_TIME" -> allTimeMeasurements(stationId, variableIds);
            case "LAST_MONTH" -> lastMonthMeasurements(stationId, variableIds);
            default -> throw new IllegalArgumentException("Unsupported graph range");
        };

        return new RestrictedGraphMeasurementResponse(
                toResponse(graph, variables),
                MeasurementVariableMapper.toResponseList(variables),
                payload.measurements(),
                payload.aggregated(),
                payload.note(),
                payload.firstMeasuredAt(),
                payload.lastMeasuredAt(),
                payload.bucketInterval()
        );
    }

    private GraphMeasurementPayload lastMonthMeasurements(Long stationId, List<Long> variableIds) {
        Instant end = Instant.now();
        Instant start = end.minus(30, ChronoUnit.DAYS);
        var measurements = measurementRepository.findByMeasurementVariableStationIdAndMeasurementVariableIdInAndIdMeasuredAtBetweenOrderByIdMeasuredAtAsc(
                stationId,
                variableIds,
                start,
                end
        );
        var responses = MeasurementMapper.toResponseList(measurements);
        return new GraphMeasurementPayload(
                responses,
                false,
                null,
                responses.isEmpty() ? null : responses.getFirst().measuredAt(),
                responses.isEmpty() ? null : responses.getLast().measuredAt(),
                null
        );
    }

    private GraphMeasurementPayload allTimeMeasurements(Long stationId, List<Long> variableIds) {
        var range = measurementRepository.findGraphMeasurementRange(stationId, variableIds);
        if (range == null || range.getFirstMeasuredAt() == null || range.getLastMeasuredAt() == null) {
            return new GraphMeasurementPayload(List.of(), true, "All-time data is aggregated for performance.", null, null, null);
        }

        String bucketInterval = bucketIntervalFor(range.getFirstMeasuredAt(), range.getLastMeasuredAt());
        var measurements = measurementRepository.findBucketedGraphMeasurements(
                stationId,
                variableIds,
                range.getFirstMeasuredAt(),
                range.getLastMeasuredAt(),
                bucketInterval
        ).stream()
                .map(measurement -> new MeasurementResponse(
                        measurement.getMeasuredAt(),
                        measurement.getVariableId(),
                        measurement.getNumericValue(),
                        null,
                        MeasurementQuality.VALID,
                        null,
                        null
                ))
                .toList();

        return new GraphMeasurementPayload(
                measurements,
                true,
                "All-time data is aggregated for performance.",
                range.getFirstMeasuredAt(),
                range.getLastMeasuredAt(),
                bucketInterval
        );
    }

    String bucketIntervalFor(Instant firstMeasuredAt, Instant lastMeasuredAt) {
        long days = Math.max(0, Duration.between(firstMeasuredAt, lastMeasuredAt).toDays());
        if (days <= 14) {
            return "30 minutes";
        }
        if (days <= 30) {
            return "1 hour";
        }
        if (days <= 180) {
            return "6 hours";
        }
        if (days <= 365) {
            return "12 hours";
        }
        if (days <= 365 * 3L) {
            return "1 day";
        }
        return "7 days";
    }

    private void validateRequest(AppUser actor, AppUser target, UserGraphConfigurationRequest request) {
        if (!RESTRICTED_ROLES.contains(target.getRole())) {
            throw new IllegalArgumentException("Graph configurations can only be assigned to technicians or viewers");
        }
        if (request.yAxisMax().compareTo(request.yAxisMin()) <= 0) {
            throw new IllegalArgumentException("Primary Y-axis maximum must be greater than minimum");
        }
        boolean usesSecondaryAxis = request.variables().stream().anyMatch(variable -> variable.axis() == GraphAxis.SECONDARY);
        if (usesSecondaryAxis && !request.secondaryAxisEnabled()) {
            throw new IllegalArgumentException("Secondary axis must be enabled when a variable uses it");
        }
        if (!usesSecondaryAxis && request.secondaryAxisEnabled()) {
            throw new IllegalArgumentException("Secondary axis must have at least one variable");
        }
        if ((request.secondaryAxisMin() == null) != (request.secondaryAxisMax() == null)) {
            throw new IllegalArgumentException("Secondary Y-axis minimum and maximum must be provided together");
        }
        if (request.secondaryAxisMin() != null && request.secondaryAxisMax().compareTo(request.secondaryAxisMin()) <= 0) {
            throw new IllegalArgumentException("Secondary Y-axis maximum must be greater than minimum");
        }
        if (request.displayOrder() == null || request.displayOrder() < 1) {
            throw new IllegalArgumentException("Display order must be greater than zero");
        }
        Station station = stationRepository.findById(request.stationId())
                .orElseThrow(() -> new ResourceNotFoundException("Station not found with id: " + request.stationId()));
        if (station.getStationCategory() != request.stationCategory()) {
            throw new IllegalArgumentException("Graph category must match the selected station category");
        }
        if (!effectiveStationIds(target).contains(station.getId())) {
            throw new IllegalArgumentException("Station " + station.getCode() + " is not assigned to the target user");
        }
        if (actor.getRole() == Role.ADMIN) {
            accessControlService.ensureStationAccess(actor, station.getId());
        }
        List<Long> variableIds = request.variables().stream()
                .map(variable -> variable.variableId())
                .filter(id -> id != null)
                .toList();
        if (variableIds.size() != request.variables().size()) {
            throw new IllegalArgumentException("Graph variables must use station-specific measurement variable IDs");
        }
        if (request.variables().stream().anyMatch(variable -> variable.axis() == null || variable.chartType() == null)) {
            throw new IllegalArgumentException("Each graph variable must have an axis and chart type");
        }
        if (request.variables().stream().anyMatch(variable -> variable.displayOrder() == null || variable.displayOrder() < 1)) {
            throw new IllegalArgumentException("Graph variable display order must be greater than zero");
        }
        if (variableIds.size() != new LinkedHashSet<>(variableIds).size()) {
            throw new IllegalArgumentException("Graph variables must be unique");
        }
        List<MeasurementVariable> variables = measurementVariableRepository.findByStationIdAndIdIn(station.getId(), variableIds);
        if (variables.size() != variableIds.size()) {
            throw new IllegalArgumentException("One or more graph variables do not belong to station " + station.getCode());
        }
        if (variables.stream().anyMatch(variable -> !variable.isActive())) {
            throw new IllegalArgumentException("Graph variables must be active");
        }
        Set<Long> targetVariableIds = target.getMeasurementVariables().stream()
                .map(MeasurementVariable::getId)
                .collect(Collectors.toSet());
        if (!targetVariableIds.containsAll(variableIds)) {
            throw new IllegalArgumentException("Graph variables must be included in the target user's Chart Access selection");
        }
        if (actor.getRole() == Role.ADMIN && variables.stream().anyMatch(variable -> !accessControlService.canAccessMeasurementVariable(actor, variable))) {
            throw new AccessDeniedException("You cannot assign graph variables outside your own scope");
        }
    }

    private void replaceVariables(UserGraphConfiguration graph, UserGraphConfigurationRequest request) {
        graph.getVariables().clear();
        request.variables().forEach(variableRequest -> {
            MeasurementVariable variable = measurementVariableRepository.getReferenceById(variableRequest.variableId());
            graph.getVariables().add(UserGraphVariable.builder()
                    .graphConfiguration(graph)
                    .measurementVariable(variable)
                    .variableCode(variableRequest.variableCode() == null ? variable.getCode() : normalizeCode(variableRequest.variableCode()))
                    .axis(variableRequest.axis())
                    .chartType(variableRequest.chartType())
                    .customLabel(trimToNull(variableRequest.customLabel()))
                    .displayOrder(variableRequest.displayOrder())
                    .build());
        });
    }

    private UserGraphConfigurationResponse toResponse(UserGraphConfiguration graph, List<MeasurementVariable> resolvedVariables) {
        Map<Long, MeasurementVariable> variableById = resolvedVariables.stream()
                .collect(Collectors.toMap(MeasurementVariable::getId, Function.identity(), (first, second) -> first));
        Map<String, MeasurementVariable> variableByCode = resolvedVariables.stream()
                .collect(Collectors.toMap(variable -> normalizeCode(variable.getCode()), Function.identity(), (first, second) -> first));
        Station station = graph.getStation();
        return new UserGraphConfigurationResponse(
                graph.getId(),
                graph.getUser().getId(),
                station == null ? null : station.getId(),
                station == null ? null : station.getName(),
                station == null ? null : station.getCode(),
                graph.getTitle(),
                graph.getDescription(),
                graph.getStationCategory(),
                graph.getYAxisMin(),
                graph.getYAxisMax(),
                graph.getPrimaryAxisLabel(),
                graph.getPrimaryAxisUnit(),
                graph.isSecondaryAxisEnabled(),
                graph.getSecondaryAxisLabel(),
                graph.getSecondaryAxisUnit(),
                graph.getSecondaryAxisMin(),
                graph.getSecondaryAxisMax(),
                graph.getDisplayOrder(),
                graph.isActive(),
                graph.getCreatedAt(),
                graph.getUpdatedAt(),
                graph.getVariables().stream()
                        .map(variable -> {
                            MeasurementVariable resolved = variable.getMeasurementVariable() == null
                                    ? variableByCode.get(variable.getVariableCode())
                                    : variableById.getOrDefault(variable.getMeasurementVariable().getId(), variable.getMeasurementVariable());
                            return new UserGraphVariableResponse(
                                    resolved == null ? null : resolved.getId(),
                                    variable.getVariableCode(),
                                    resolved == null ? null : resolved.getDisplayName(),
                                    resolved == null ? null : resolved.getUnit(),
                                    variable.getAxis(),
                                    variable.getChartType(),
                                    variable.getDisplayOrder(),
                                    variable.getCustomLabel()
                            );
                        })
                        .toList()
        );
    }

    private void ensureCanManage(AppUser actor, AppUser target) {
        if (actor.getRole() == Role.SUPER_ADMIN) {
            return;
        }
        if (actor.getRole() != Role.ADMIN || !RESTRICTED_ROLES.contains(target.getRole())) {
            throw new AccessDeniedException("You do not have permission to manage graph configurations");
        }
    }

    private Set<Long> effectiveStationIds(AppUser target) {
        Set<Long> explicitStationIds = target.getStations().stream()
                .map(Station::getId)
                .collect(Collectors.toSet());
        if (!explicitStationIds.isEmpty()) {
            return explicitStationIds;
        }
        return target.getFarms().stream()
                .filter(farm -> farm != null)
                .flatMap(farm -> stationRepository.findAll().stream()
                        .filter(station -> station.getFarm() != null && station.getFarm().getId().equals(farm.getId()))
                        .map(Station::getId))
                .collect(Collectors.toSet());
    }

    private AppUser findUser(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
    }

    private String normalizeCode(String code) {
        return code.trim();
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private record GraphMeasurementPayload(
            List<MeasurementResponse> measurements,
            boolean aggregated,
            String note,
            Instant firstMeasuredAt,
            Instant lastMeasuredAt,
            String bucketInterval
    ) {
    }
}
