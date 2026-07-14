package com.nexus.platform.controller;

import com.nexus.platform.dto.measurement.MeasurementRequest;
import com.nexus.platform.dto.measurement.MeasurementResponse;
import com.nexus.platform.service.MeasurementService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
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

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/measurements")
public class MeasurementController {

    private final MeasurementService measurementService;

    public MeasurementController(MeasurementService measurementService) {
        this.measurementService = measurementService;
    }

    @GetMapping
    public ResponseEntity<List<MeasurementResponse>> findAll(
            @RequestParam(required = false) Long variableId,
            @RequestParam(required = false) Long sensorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant end,
            @RequestParam(required = false) List<String> measurementTypes,
            Authentication authentication
    ) {
        Long requestedVariableId = variableId != null ? variableId : sensorId;
        if (requestedVariableId != null && start != null && end != null) {
            return ResponseEntity.ok(measurementService.findByVariableIdAndTimeBetween(
                    requestedVariableId,
                    start,
                    end,
                    authentication.getName(),
                    measurementTypes
            ));
        }

        if (requestedVariableId != null) {
            return ResponseEntity.ok(measurementService.findByVariableId(requestedVariableId, authentication.getName(), measurementTypes));
        }

        return ResponseEntity.ok(measurementService.findAll(authentication.getName()));
    }

    @GetMapping("/{variableId}/{time}")
    public ResponseEntity<MeasurementResponse> findById(
            @PathVariable Long variableId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant time,
            Authentication authentication
    ) {
        return ResponseEntity.ok(measurementService.findById(time, variableId, authentication.getName()));
    }

    @PostMapping
    public ResponseEntity<MeasurementResponse> create(@Valid @RequestBody MeasurementRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(measurementService.create(request));
    }

    @PutMapping("/{variableId}/{time}")
    public ResponseEntity<MeasurementResponse> update(
            @PathVariable Long variableId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant time,
            @Valid @RequestBody MeasurementRequest request
    ) {
        return ResponseEntity.ok(measurementService.update(time, variableId, request));
    }

    @DeleteMapping("/{variableId}/{time}")
    public ResponseEntity<Void> delete(
            @PathVariable Long variableId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant time
    ) {
        measurementService.delete(time, variableId);
        return ResponseEntity.noContent().build();
    }
}
