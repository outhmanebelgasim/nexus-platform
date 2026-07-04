package com.nexus.platform.controller;

import com.nexus.platform.dto.importlog.ImportLogRequest;
import com.nexus.platform.dto.importlog.ImportLogResponse;
import com.nexus.platform.service.ImportLogService;
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
import java.util.UUID;

@RestController
@RequestMapping("/api/import-logs")
public class ImportLogController {

    private final ImportLogService importLogService;

    public ImportLogController(ImportLogService importLogService) {
        this.importLogService = importLogService;
    }

    @GetMapping
    public ResponseEntity<List<ImportLogResponse>> findAll() {
        return ResponseEntity.ok(importLogService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ImportLogResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(importLogService.findById(id));
    }

    @GetMapping("/search")
    public ResponseEntity<ImportLogResponse> findByBatchId(@RequestParam UUID batchId) {
        return ResponseEntity.ok(importLogService.findByBatchId(batchId));
    }

    @PostMapping
    public ResponseEntity<ImportLogResponse> create(@Valid @RequestBody ImportLogRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(importLogService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ImportLogResponse> update(@PathVariable Long id, @Valid @RequestBody ImportLogRequest request) {
        return ResponseEntity.ok(importLogService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        importLogService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
