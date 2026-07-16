package com.nexus.platform.service;

import com.nexus.domain.enums.ImportStatus;
import com.nexus.platform.dto.importer.ImporterFileResponse;
import com.nexus.platform.dto.importer.ImporterLogPageResponse;
import com.nexus.platform.dto.importer.ImporterStatusResponse;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;

public interface ImporterMonitoringService {

    ImporterStatusResponse getStatus();

    ImporterLogPageResponse getLogs(ImportStatus status, String filename, Instant start, Instant end, Pageable pageable);

    List<ImporterFileResponse> getFiles();
}
