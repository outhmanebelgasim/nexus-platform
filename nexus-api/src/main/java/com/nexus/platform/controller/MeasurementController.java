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
            @RequestParam(required = false) Long sensorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant end,
            @RequestParam(required = false) List<String> measurementTypes,
            Authentication authentication
    ) {
        if (sensorId != null && start != null && end != null) {
            return ResponseEntity.ok(measurementService.findBySensorIdAndTimeBetween(
                    sensorId,
                    start,
                    end,
                    authentication.getName(),
                    measurementTypes
            ));
        }

        if (sensorId != null) {
            return ResponseEntity.ok(measurementService.findBySensorId(sensorId, authentication.getName(), measurementTypes));
        }

        return ResponseEntity.ok(measurementService.findAll(authentication.getName()));
    }

    @GetMapping("/{sensorId}/{time}")
    public ResponseEntity<MeasurementResponse> findById(
            @PathVariable Long sensorId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant time,
            Authentication authentication
    ) {
        return ResponseEntity.ok(measurementService.findById(time, sensorId, authentication.getName()));
    }

    @PostMapping
    public ResponseEntity<MeasurementResponse> create(@Valid @RequestBody MeasurementRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(measurementService.create(request));
    }

    @PutMapping("/{sensorId}/{time}")
    public ResponseEntity<MeasurementResponse> update(
            @PathVariable Long sensorId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant time,
            @Valid @RequestBody MeasurementRequest request
    ) {
        return ResponseEntity.ok(measurementService.update(time, sensorId, request));
    }

    @DeleteMapping("/{sensorId}/{time}")
    public ResponseEntity<Void> delete(
            @PathVariable Long sensorId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant time
    ) {
        measurementService.delete(time, sensorId);
        return ResponseEntity.noContent().build();
    }
}
