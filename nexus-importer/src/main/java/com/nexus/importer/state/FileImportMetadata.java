package com.nexus.importer.state;

import java.time.Instant;

public record FileImportMetadata(
		String fileKey,
		String fileName,
		Instant lastModifiedAt,
		long fileSizeBytes) {
}
