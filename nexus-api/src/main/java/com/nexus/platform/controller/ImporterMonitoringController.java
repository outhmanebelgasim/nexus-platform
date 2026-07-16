package com.nexus.platform.controller;

import com.nexus.domain.enums.ImportStatus;
import com.nexus.platform.dto.importer.ImporterFileResponse;
import com.nexus.platform.dto.importer.ImporterLogPageResponse;
import com.nexus.platform.dto.importer.ImporterStatusResponse;
import com.nexus.platform.service.ImporterMonitoringService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/importer")
public class ImporterMonitoringController {

    private final ImporterMonitoringService importerMonitoringService;

    public ImporterMonitoringController(ImporterMonitoringService importerMonitoringService) {
        this.importerMonitoringService = importerMonitoringService;
    }

    @GetMapping("/status")
    public ResponseEntity<ImporterStatusResponse> getStatus() {
        return ResponseEntity.ok(importerMonitoringService.getStatus());
    }

    @GetMapping("/logs")
    public ResponseEntity<ImporterLogPageResponse> getLogs(
            @RequestParam(required = false) ImportStatus status,
            @RequestParam(required = false) String filename,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant end,
            @PageableDefault(size = 20, sort = "startedAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(importerMonitoringService.getLogs(status, filename, start, end, pageable));
    }

    @GetMapping("/files")
    public ResponseEntity<List<ImporterFileResponse>> getFiles() {
        return ResponseEntity.ok(importerMonitoringService.getFiles());
    }
}
