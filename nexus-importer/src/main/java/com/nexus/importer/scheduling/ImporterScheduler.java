package com.nexus.importer.scheduling;

import java.util.List;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

import org.springframework.beans.factory.annotation.Autowired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.nexus.importer.file.DatFileDescriptor;
import com.nexus.importer.file.DatFileScanner;
import com.nexus.importer.logging.ImportLogService;
import com.nexus.importer.parser.ParsedDatFile;
import com.nexus.importer.parser.DatFileParser;
import com.nexus.importer.measurement.MeasurementPersistenceResult;
import com.nexus.importer.state.CheckpointedParsedFile;
import com.nexus.importer.state.ImportFileStateService;
import com.nexus.importer.state.ImportStateDecision;
import com.nexus.importer.station.ResolvedStation;
import com.nexus.importer.station.StationDiscoveryService;

@Component
@ConditionalOnProperty(prefix = "nexus.importer", name = "enabled", havingValue = "true")
public class ImporterScheduler {

	private static final Logger log = LoggerFactory.getLogger(ImporterScheduler.class);

	private final DatFileScanner datFileScanner;
	private final DatFileParser datFileParser;
	private final DatFileImportService datFileImportService;
	private final ImportLogService importLogService;
	private final ImportFileStateService importFileStateService;
	private final StationDiscoveryService stationDiscoveryService;
	private final ImportRecoveryDecisionService importRecoveryDecisionService;
	private final Clock clock;
	private final AtomicBoolean scanRunning = new AtomicBoolean(false);

	@Autowired
	public ImporterScheduler(
			DatFileScanner datFileScanner,
			DatFileParser datFileParser,
			DatFileImportService datFileImportService,
			ImportLogService importLogService,
			ImportFileStateService importFileStateService,
			StationDiscoveryService stationDiscoveryService,
			ImportRecoveryDecisionService importRecoveryDecisionService) {
		this(datFileScanner, datFileParser, datFileImportService, importLogService, importFileStateService, stationDiscoveryService, importRecoveryDecisionService, Clock.systemUTC());
	}

	ImporterScheduler(
			DatFileScanner datFileScanner,
			DatFileParser datFileParser,
			DatFileImportService datFileImportService,
			ImportLogService importLogService,
			ImportFileStateService importFileStateService,
			StationDiscoveryService stationDiscoveryService,
			ImportRecoveryDecisionService importRecoveryDecisionService,
			Clock clock) {
		this.datFileScanner = datFileScanner;
		this.datFileParser = datFileParser;
		this.datFileImportService = datFileImportService;
		this.importLogService = importLogService;
		this.importFileStateService = importFileStateService;
		this.stationDiscoveryService = stationDiscoveryService;
		this.importRecoveryDecisionService = importRecoveryDecisionService;
		this.clock = clock;
	}

	@Scheduled(
			fixedDelayString = "${nexus.importer.scan-delay}",
			initialDelayString = "${nexus.importer.initial-delay}")
	public void scanForDatFiles() {
		if (!scanRunning.compareAndSet(false, true)) {
			log.warn("Skipping DAT scan because a previous scan is still running");
			return;
		}
		try {
			List<DatFileDescriptor> discoveredFiles = datFileScanner.scan();
			if (discoveredFiles.isEmpty()) {
				log.info("No supported DAT files discovered");
				return;
			}

			for (DatFileDescriptor discoveredFile : discoveredFiles) {
				ResolvedStation resolvedStation = stationDiscoveryService.resolve(discoveredFile);
				ImportStateDecision stateDecision = importFileStateService.prepare(discoveredFile);
				ParsedDatFile parsedFile = datFileParser.parse(discoveredFile);
				if (parsedFile.variables().isEmpty()) {
					recordSkipped(discoveredFile, parsedFile, "No usable variable headers");
					log.warn("Skipped DAT file filename={} stationCode={} parseIssues={} path={}",
							discoveredFile.originalFilename(),
							discoveredFile.stationCode(),
							parsedFile.issues().size(),
							discoveredFile.path());
					continue;
				}

				String headerSignature = importFileStateService.headerSignature(parsedFile);
				ImportRecoveryDecision recoveryDecision = importRecoveryDecisionService.decide(
						discoveredFile,
						resolvedStation,
						stateDecision,
						parsedFile,
						headerSignature);
				if (!recoveryDecision.importRequired()) {
					log.info("Skipped unchanged DAT file filename={} stationCode={} stationResolution={} reason={} path={}",
							discoveredFile.originalFilename(),
							discoveredFile.stationCode(),
							resolvedStation.created() ? "created" : "existing",
							recoveryDecision.reason(),
							discoveredFile.path());
					continue;
				}

				if (recoveryDecision.forceFullRescan()) {
					log.warn("Recovering DAT file with full historical rescan filename={} stationCode={} reason={} path={}",
							discoveredFile.originalFilename(),
							discoveredFile.stationCode(),
							recoveryDecision.reason(),
							discoveredFile.path());
				}
				CheckpointedParsedFile checkpointedFile = importFileStateService.applyCheckpoint(
						parsedFile,
						stateDecision,
						recoveryDecision.forceFullRescan());

				UUID batchId = UUID.randomUUID();
				Instant startedAt = clock.instant();
				try {
					DatFileImportResult importResult = datFileImportService.importFile(
							discoveredFile,
							resolvedStation,
							checkpointedFile,
							stateDecision,
							batchId,
							startedAt);
					recordCompleted(discoveredFile, checkpointedFile.fileForImport(), importResult);
					MeasurementPersistenceResult measurementPersistence = importResult.measurementPersistence();
					log.info("Imported DAT file filename={} stationCode={} classification={} stationResolution={} checkpointMode={} importReason={} parsedVariableCount={} importRowCount={} variablesCreated={} variablesReused={} variablesUpdated={} measurementCandidates={} measurementsInserted={} measurementsUpdated={} measurementsUnchanged={} missingValueCount={} invalidValueCount={} skippedRowCount={} measurementBatches={} durationMs={} parseIssueCount={} path={}",
							discoveredFile.originalFilename(),
							discoveredFile.stationCode(),
							discoveredFile.fileType(),
							importResult.stationCreated() ? "created" : "existing",
							checkpointMode(checkpointedFile),
							recoveryDecision.reason(),
							parsedFile.variables().stream().filter(variable -> !variable.timestampColumn()).count(),
							checkpointedFile.fileForImport().rows().size(),
							importResult.variableResolution().createdCount(),
							importResult.variableResolution().reusedCount(),
							importResult.variableResolution().updatedCount(),
							measurementPersistence.candidates(),
							measurementPersistence.inserted(),
							measurementPersistence.updated(),
							measurementPersistence.unchanged(),
							measurementPersistence.missing(),
							measurementPersistence.invalid(),
							measurementPersistence.skippedRows(),
							measurementPersistence.batches(),
							measurementPersistence.duration().toMillis(),
							parsedFile.issues().size(),
							discoveredFile.path());
				}
				catch (Exception ex) {
					recordFailed(discoveredFile, parsedFile, batchId, startedAt, ex);
					log.error("DAT file import failed filename={} stationCode={} path={}",
							discoveredFile.originalFilename(),
							discoveredFile.stationCode(),
							discoveredFile.path(),
							ex);
				}
			}
		}
		catch (Exception ex) {
			log.error("DAT file discovery failed", ex);
		}
		finally {
			scanRunning.set(false);
		}
	}

	private String checkpointMode(CheckpointedParsedFile checkpointedFile) {
		if (checkpointedFile.resumed()) {
			return "resumed";
		}
		if (checkpointedFile.reset()) {
			return "full-rescan";
		}
		return "full";
	}

	private void recordCompleted(DatFileDescriptor descriptor, ParsedDatFile parsedFile, DatFileImportResult importResult) {
		try {
			importLogService.recordCompleted(descriptor, parsedFile, importResult);
		}
		catch (Exception ex) {
			log.error("Import log persistence failed after successful file import filename={} batchId={}",
					descriptor.originalFilename(),
					importResult.batchId(),
					ex);
		}
	}

	private void recordFailed(
			DatFileDescriptor descriptor,
			ParsedDatFile parsedFile,
			UUID batchId,
			Instant startedAt,
			Exception failure) {
		try {
			importLogService.recordFailed(descriptor, parsedFile, batchId, startedAt, failure);
		}
		catch (Exception logFailure) {
			log.error("Import failure log persistence failed filename={} batchId={}",
					descriptor.originalFilename(),
					batchId,
					logFailure);
		}
	}

	private void recordSkipped(DatFileDescriptor descriptor, ParsedDatFile parsedFile, String reason) {
		try {
			importLogService.recordSkipped(descriptor, parsedFile, reason);
		}
		catch (Exception ex) {
			log.error("Skipped import log persistence failed filename={}", descriptor.originalFilename(), ex);
		}
	}

}
