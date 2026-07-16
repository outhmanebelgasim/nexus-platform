package com.nexus.importer.measurement;

import java.time.Instant;
import java.util.UUID;

public record MeasurementImportCandidate(
		Long variableId,
		Instant measuredAt,
		Double numericValue,
		UUID importBatchId,
		Instant createdAt) {
}
