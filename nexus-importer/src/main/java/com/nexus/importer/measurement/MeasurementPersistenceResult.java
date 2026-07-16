package com.nexus.importer.measurement;

import java.time.Duration;

public record MeasurementPersistenceResult(
		int candidates,
		int inserted,
		int updated,
		int unchanged,
		int missing,
		int invalid,
		int skippedRows,
		int batches,
		Duration duration) {
}
