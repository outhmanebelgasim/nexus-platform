package com.nexus.platform.controller;

import com.nexus.domain.enums.StationCategory;
import com.nexus.platform.dto.graph.RestrictedGraphMeasurementResponse;
import com.nexus.platform.dto.graph.UserGraphConfigurationRequest;
import com.nexus.platform.dto.graph.UserGraphConfigurationResponse;
import com.nexus.platform.dto.graph.UserGraphReorderRequest;
import com.nexus.platform.dto.station.StationResponse;
import com.nexus.platform.service.UserGraphConfigurationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class UserGraphConfigurationController {

    private final UserGraphConfigurationService graphConfigurationService;

    public UserGraphConfigurationController(UserGraphConfigurationService graphConfigurationService) {
        this.graphConfigurationService = graphConfigurationService;
    }

    @GetMapping("/api/users/{userId}/graph-configurations")
    public ResponseEntity<List<UserGraphConfigurationResponse>> findForUser(
            @PathVariable Long userId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(graphConfigurationService.findForUser(userId, authentication.getName()));
    }

    @PostMapping("/api/users/{userId}/graph-configurations")
    public ResponseEntity<UserGraphConfigurationResponse> create(
            @PathVariable Long userId,
            @Valid @RequestBody UserGraphConfigurationRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(graphConfigurationService.create(userId, request, authentication.getName()));
    }

    @PutMapping("/api/users/{userId}/graph-configurations/{graphId}")
    public ResponseEntity<UserGraphConfigurationResponse> update(
            @PathVariable Long userId,
            @PathVariable Long graphId,
            @Valid @RequestBody UserGraphConfigurationRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(graphConfigurationService.update(userId, graphId, request, authentication.getName()));
    }

    @DeleteMapping("/api/users/{userId}/graph-configurations/{graphId}")
    public ResponseEntity<Void> delete(
            @PathVariable Long userId,
            @PathVariable Long graphId,
            Authentication authentication
    ) {
        graphConfigurationService.delete(userId, graphId, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/api/users/{userId}/graph-configurations/reorder")
    public ResponseEntity<List<UserGraphConfigurationResponse>> reorder(
            @PathVariable Long userId,
            @Valid @RequestBody UserGraphReorderRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(graphConfigurationService.reorder(userId, request.graphIds(), authentication.getName()));
    }

    @GetMapping("/api/me/station-categories")
    public ResponseEntity<List<StationCategory>> currentStationCategories(Authentication authentication) {
        return ResponseEntity.ok(graphConfigurationService.currentStationCategories(authentication.getName()));
    }

    @GetMapping("/api/me/stations")
    public ResponseEntity<List<StationResponse>> currentStations(
            @RequestParam StationCategory category,
            Authentication authentication
    ) {
        return ResponseEntity.ok(graphConfigurationService.currentStations(category, authentication.getName()));
    }

    @GetMapping("/api/me/graph-configurations")
    public ResponseEntity<List<UserGraphConfigurationResponse>> currentGraphConfigurations(
            @RequestParam StationCategory category,
            Authentication authentication
    ) {
        return ResponseEntity.ok(graphConfigurationService.currentGraphConfigurations(category, authentication.getName()));
    }

    @GetMapping("/api/me/stations/{stationId}/graphs")
    public ResponseEntity<List<UserGraphConfigurationResponse>> currentStationGraphConfigurations(
            @PathVariable Long stationId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(graphConfigurationService.currentStationGraphConfigurations(stationId, authentication.getName()));
    }

    @GetMapping("/api/me/stations/{stationId}/graphs/{graphId}/measurements")
    public ResponseEntity<RestrictedGraphMeasurementResponse> currentGraphMeasurements(
            @PathVariable Long stationId,
            @PathVariable Long graphId,
            @RequestParam(defaultValue = "LAST_MONTH") String range,
            Authentication authentication
    ) {
        return ResponseEntity.ok(graphConfigurationService.currentGraphMeasurements(stationId, graphId, range, authentication.getName()));
    }
}
