package com.nexus.platform.controller;

import com.nexus.platform.dto.alert.AlertRequest;
import com.nexus.platform.dto.alert.AlertResponse;
import com.nexus.platform.service.AlertService;
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
@RequestMapping("/api/alerts")
public class AlertController {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    @GetMapping
    public ResponseEntity<List<AlertResponse>> findAll(
            @RequestParam(required = false) Long variableId,
            @RequestParam(required = false) Long sensorId,
            Authentication authentication
    ) {
        Long requestedVariableId = variableId != null ? variableId : sensorId;
        if (requestedVariableId != null) {
            return ResponseEntity.ok(alertService.findByVariableId(requestedVariableId, authentication.getName()));
        }

        return ResponseEntity.ok(alertService.findAll(authentication.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AlertResponse> findById(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(alertService.findById(id, authentication.getName()));
    }

    @PostMapping
    public ResponseEntity<AlertResponse> create(@Valid @RequestBody AlertRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(alertService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AlertResponse> update(@PathVariable Long id, @Valid @RequestBody AlertRequest request) {
        return ResponseEntity.ok(alertService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        alertService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
