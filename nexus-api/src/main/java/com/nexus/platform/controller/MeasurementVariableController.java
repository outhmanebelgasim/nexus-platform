package com.nexus.platform.controller;

import com.nexus.platform.dto.measurementvariable.MeasurementVariableRequest;
import com.nexus.platform.dto.measurementvariable.MeasurementVariableResponse;
import com.nexus.platform.service.MeasurementVariableService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/api/measurement-variables", "/api/sensors"})
public class MeasurementVariableController {

    private final MeasurementVariableService measurementVariableService;

    public MeasurementVariableController(MeasurementVariableService measurementVariableService) {
        this.measurementVariableService = measurementVariableService;
    }

    @GetMapping
    public ResponseEntity<List<MeasurementVariableResponse>> findAll(
            @RequestParam(required = false) Long stationId,
            Authentication authentication
    ) {
        if (stationId != null) {
            return ResponseEntity.ok(measurementVariableService.findByStationId(stationId, authentication.getName()));
        }

        return ResponseEntity.ok(measurementVariableService.findAll(authentication.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MeasurementVariableResponse> findById(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(measurementVariableService.findById(id, authentication.getName()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MeasurementVariableResponse> update(@PathVariable Long id, @Valid @RequestBody MeasurementVariableRequest request) {
        return ResponseEntity.ok(measurementVariableService.update(id, request));
    }
}
