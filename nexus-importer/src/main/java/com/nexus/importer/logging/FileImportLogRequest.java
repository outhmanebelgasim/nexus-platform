package com.nexus.importer.logging;

import java.time.Instant;
import java.util.UUID;

import com.nexus.domain.enums.ImportStatus;

public record FileImportLogRequest(
		UUID batchId,
		String fileName,
		String filePath,
		ImportStatus status,
		Integer totalRows,
		Integer importedRows,
		Integer skippedRows,
		String errorMessage,
		Instant startedAt,
		Instant finishedAt) {
}
