package com.nexus.platform.service;

import com.nexus.domain.entity.AppUser;
import com.nexus.domain.entity.Farm;
import com.nexus.domain.entity.Station;
import com.nexus.domain.enums.MeasurementType;
import com.nexus.domain.enums.Role;
import com.nexus.platform.dto.user.UserPermissionsResponse;
import com.nexus.platform.exception.ResourceNotFoundException;
import com.nexus.platform.repository.FarmRepository;
import com.nexus.platform.repository.StationRepository;
import com.nexus.platform.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AccessControlService {

    private final UserRepository userRepository;
    private final FarmRepository farmRepository;
    private final StationRepository stationRepository;

    public AccessControlService(
            UserRepository userRepository,
            FarmRepository farmRepository,
            StationRepository stationRepository
    ) {
        this.userRepository = userRepository;
        this.farmRepository = farmRepository;
        this.stationRepository = stationRepository;
    }

    public AppUser findUserByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Current user not found"));
    }

    public UserPermissionsResponse permissionsFor(String email) {
        AppUser user = findUserByEmail(email);
        return new UserPermissionsResponse(
                user.getRole(),
                accessibleFarmIds(user),
                accessibleStationIds(user),
                accessibleMeasurementTypes(user)
        );
    }

    public boolean hasUnrestrictedAccess(AppUser user) {
        return user != null && user.getRole() == Role.SUPER_ADMIN;
    }

    public Set<Long> accessibleFarmIds(AppUser user) {
        if (hasUnrestrictedAccess(user)) {
            return farmRepository.findAll().stream().map(Farm::getId).collect(Collectors.toUnmodifiableSet());
        }

        return user.getFarms().stream().map(Farm::getId).collect(Collectors.toUnmodifiableSet());
    }

    public Set<Long> accessibleStationIds(AppUser user) {
        if (hasUnrestrictedAccess(user)) {
            return stationRepository.findAll().stream().map(Station::getId).collect(Collectors.toUnmodifiableSet());
        }

        Set<Long> stationIds = user.getStations().stream().map(Station::getId).collect(Collectors.toSet());
        user.getFarms().stream()
                .map(Farm::getId)
                .forEach(farmId -> stationRepository.findByFarmId(farmId).stream()
                        .map(Station::getId)
                        .forEach(stationIds::add));
        return Set.copyOf(stationIds);
    }

    public Set<MeasurementType> accessibleMeasurementTypes(AppUser user) {
        if (hasUnrestrictedAccess(user)) {
            return EnumSet.allOf(MeasurementType.class);
        }

        if (user.getAllowedMeasurementTypes().isEmpty()) {
            return Set.of();
        }

        return Set.copyOf(user.getAllowedMeasurementTypes());
    }

    @Transactional
    public void assignAccess(AppUser actor, AppUser target, Set<Long> farmIds, Set<Long> stationIds, Set<MeasurementType> measurementTypes) {
        Set<Long> requestedFarmIds = farmIds == null ? Set.of() : Set.copyOf(farmIds);
        Set<Long> requestedStationIds = stationIds == null ? Set.of() : Set.copyOf(stationIds);
        Set<MeasurementType> requestedTypes = measurementTypes == null ? Set.of() : Set.copyOf(measurementTypes);

        List<Farm> farms = farmRepository.findAllById(requestedFarmIds);
        List<Station> stations = stationRepository.findAllById(requestedStationIds);
        ensureAllIdsExist("Farm", requestedFarmIds, farms.stream().map(Farm::getId).collect(Collectors.toSet()));
        ensureAllIdsExist("Station", requestedStationIds, stations.stream().map(Station::getId).collect(Collectors.toSet()));
        ensureActorCanAssign(actor, requestedFarmIds, requestedStationIds, requestedTypes);

        target.getFarms().clear();
        target.getFarms().addAll(farms);
        target.getStations().clear();
        target.getStations().addAll(stations);
        target.getAllowedMeasurementTypes().clear();
        target.getAllowedMeasurementTypes().addAll(requestedTypes);
    }

    public void ensureFarmAccess(AppUser user, Long farmId) {
        if (!hasUnrestrictedAccess(user) && !accessibleFarmIds(user).contains(farmId)) {
            throw new AccessDeniedException("You do not have permission to access this farm");
        }
    }

    public void ensureStationAccess(AppUser user, Long stationId) {
        if (!hasUnrestrictedAccess(user) && !accessibleStationIds(user).contains(stationId)) {
            throw new AccessDeniedException("You do not have permission to access this station");
        }
    }

    public void ensureMeasurementTypeAccess(AppUser user, String measurementType) {
        if (hasUnrestrictedAccess(user)) {
            return;
        }
        MeasurementType type = parseMeasurementType(measurementType);
        if (!accessibleMeasurementTypes(user).contains(type)) {
            throw new AccessDeniedException("You do not have permission to access this measurement type");
        }
    }

    private void ensureActorCanAssign(
            AppUser actor,
            Set<Long> requestedFarmIds,
            Set<Long> requestedStationIds,
            Set<MeasurementType> requestedTypes
    ) {
        if (actor == null || hasUnrestrictedAccess(actor)) {
            return;
        }

        if (actor.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("You do not have permission to manage user access");
        }

        if (!accessibleFarmIds(actor).containsAll(requestedFarmIds)
                || !accessibleStationIds(actor).containsAll(requestedStationIds)
                || !accessibleMeasurementTypes(actor).containsAll(requestedTypes)) {
            throw new AccessDeniedException("You cannot assign access outside your own scope");
        }
    }

    private MeasurementType parseMeasurementType(String measurementType) {
        try {
            return MeasurementType.valueOf(measurementType);
        } catch (IllegalArgumentException ex) {
            throw new AccessDeniedException("Unknown measurement type");
        }
    }

    private void ensureAllIdsExist(String resourceName, Collection<Long> requestedIds, Set<Long> existingIds) {
        if (!existingIds.containsAll(requestedIds)) {
            throw new ResourceNotFoundException(resourceName + " access contains unknown id");
        }
    }
}
