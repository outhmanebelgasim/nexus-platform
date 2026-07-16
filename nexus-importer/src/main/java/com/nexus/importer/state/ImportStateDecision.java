package com.nexus.importer.state;

public record ImportStateDecision(
		FileImportMetadata metadata,
		ImportFileState existingState,
		boolean unchanged) {
}
