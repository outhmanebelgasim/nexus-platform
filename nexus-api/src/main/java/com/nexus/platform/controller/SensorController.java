package com.nexus.platform.controller;

import com.nexus.platform.dto.sensor.SensorRequest;
import com.nexus.platform.dto.sensor.SensorResponse;
import com.nexus.platform.service.SensorService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/sensors")
public class SensorController {

    private final SensorService sensorService;

    public SensorController(SensorService sensorService) {
        this.sensorService = sensorService;
    }

    @GetMapping
    public ResponseEntity<List<SensorResponse>> findAll(@RequestParam(required = false) Long stationId) {
        if (stationId != null) {
            return ResponseEntity.ok(sensorService.findByStationId(stationId));
        }

        return ResponseEntity.ok(sensorService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SensorResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(sensorService.findById(id));
    }

    @PostMapping
    public ResponseEntity<SensorResponse> create(@Valid @RequestBody SensorRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sensorService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SensorResponse> update(@PathVariable Long id, @Valid @RequestBody SensorRequest request) {
        return ResponseEntity.ok(sensorService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        sensorService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
