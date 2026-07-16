package com.nexus.importer.scheduling;

import java.time.Instant;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nexus.importer.file.DatFileDescriptor;
import com.nexus.importer.measurement.MeasurementPersistenceResult;
import com.nexus.importer.measurement.MeasurementPersistenceService;
import com.nexus.importer.parser.ParsedDatFile;
import com.nexus.importer.station.ResolvedStation;
import com.nexus.importer.state.CheckpointedParsedFile;
import com.nexus.importer.state.ImportStateDecision;
import com.nexus.importer.state.ImportFileStateService;
import com.nexus.importer.variable.MeasurementVariableResolutionResult;
import com.nexus.importer.variable.MeasurementVariableResolutionService;

@Service
public class DatFileImportService {

	private final MeasurementVariableResolutionService measurementVariableResolutionService;
	private final MeasurementPersistenceService measurementPersistenceService;
	private final ImportFileStateService importFileStateService;

	public DatFileImportService(
			MeasurementVariableResolutionService measurementVariableResolutionService,
			MeasurementPersistenceService measurementPersistenceService,
			ImportFileStateService importFileStateService) {
		this.measurementVariableResolutionService = measurementVariableResolutionService;
		this.measurementPersistenceService = measurementPersistenceService;
		this.importFileStateService = importFileStateService;
	}

	@Transactional
	public DatFileImportResult importFile(
			DatFileDescriptor descriptor,
			ResolvedStation resolvedStation,
			CheckpointedParsedFile checkpointedFile,
			ImportStateDecision stateDecision,
			UUID batchId,
			Instant startedAt) {
		ParsedDatFile parsedFile = checkpointedFile.fileForImport();
		MeasurementVariableResolutionResult variableResolution = measurementVariableResolutionService.resolve(
				resolvedStation.station(),
				parsedFile);
		MeasurementPersistenceResult measurementPersistence = measurementPersistenceService.persist(
				parsedFile,
				variableResolution,
				batchId);
		importFileStateService.markSuccessful(descriptor, checkpointedFile, stateDecision, batchId);
		return new DatFileImportResult(
				batchId,
				startedAt,
				Instant.now(),
				resolvedStation.created(),
				variableResolution,
				measurementPersistence);
	}
}
