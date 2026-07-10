package com.nexus.platform.controller;

import com.nexus.platform.dto.station.StationRequest;
import com.nexus.platform.dto.station.StationResponse;
import com.nexus.platform.service.StationService;
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
@RequestMapping("/api/stations")
public class StationController {

    private final StationService stationService;

    public StationController(StationService stationService) {
        this.stationService = stationService;
    }

    @GetMapping
    public ResponseEntity<List<StationResponse>> findAll(
            @RequestParam(required = false) Long farmId,
            Authentication authentication
    ) {
        if (farmId != null) {
            return ResponseEntity.ok(stationService.findByFarmId(farmId, authentication.getName()));
        }

        return ResponseEntity.ok(stationService.findAll(authentication.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StationResponse> findById(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(stationService.findById(id, authentication.getName()));
    }

    @PostMapping
    public ResponseEntity<StationResponse> create(@Valid @RequestBody StationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(stationService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<StationResponse> update(@PathVariable Long id, @Valid @RequestBody StationRequest request) {
        return ResponseEntity.ok(stationService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        stationService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
