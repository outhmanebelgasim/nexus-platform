package com.nexus.importer.scheduling;

import java.time.Instant;
import java.util.UUID;

import com.nexus.importer.measurement.MeasurementPersistenceResult;
import com.nexus.importer.variable.MeasurementVariableResolutionResult;

public record DatFileImportResult(
		UUID batchId,
		Instant startedAt,
		Instant finishedAt,
		boolean stationCreated,
		MeasurementVariableResolutionResult variableResolution,
		MeasurementPersistenceResult measurementPersistence) {
}
