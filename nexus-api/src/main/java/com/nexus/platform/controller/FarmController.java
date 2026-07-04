package com.nexus.platform.controller;

import com.nexus.platform.dto.farm.FarmRequest;
import com.nexus.platform.dto.farm.FarmResponse;
import com.nexus.platform.service.FarmService;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/farms")
public class FarmController {

    private final FarmService farmService;

    public FarmController(FarmService farmService) {
        this.farmService = farmService;
    }

    @GetMapping
    public ResponseEntity<List<FarmResponse>> findAll() {
        return ResponseEntity.ok(farmService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<FarmResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(farmService.findById(id));
    }

    @PostMapping
    public ResponseEntity<FarmResponse> create(@Valid @RequestBody FarmRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(farmService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FarmResponse> update(@PathVariable Long id, @Valid @RequestBody FarmRequest request) {
        return ResponseEntity.ok(farmService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        farmService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
