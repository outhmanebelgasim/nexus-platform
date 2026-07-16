package com.nexus.importer.logging;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.nexus.domain.entity.ImportLog;
import com.nexus.domain.enums.ImportStatus;
import com.nexus.importer.file.DatFileDescriptor;
import com.nexus.importer.measurement.MeasurementPersistenceResult;
import com.nexus.importer.parser.ParsedDatFile;
import com.nexus.importer.repository.ImporterImportLogRepository;
import com.nexus.importer.scheduling.DatFileImportResult;

@Service
public class ImportLogService {

	private static final int MAX_ERROR_MESSAGE_LENGTH = 4000;

	private final ImporterImportLogRepository importLogRepository;
	private final Clock clock;

	@Autowired
	public ImportLogService(ImporterImportLogRepository importLogRepository) {
		this(importLogRepository, Clock.systemUTC());
	}

	ImportLogService(ImporterImportLogRepository importLogRepository, Clock clock) {
		this.importLogRepository = importLogRepository;
		this.clock = clock;
	}

	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public void recordCompleted(DatFileDescriptor descriptor, ParsedDatFile parsedFile, DatFileImportResult importResult) {
		MeasurementPersistenceResult measurementResult = importResult.measurementPersistence();
		ImportStatus status = completedStatus(parsedFile, measurementResult);
		save(new FileImportLogRequest(
				importResult.batchId(),
				descriptor.originalFilename(),
				descriptor.path().toString(),
				status,
				parsedFile.rows().size(),
				measurementResult.candidates(),
				skippedCount(parsedFile, measurementResult),
				completedMessage(status, parsedFile, measurementResult),
				importResult.startedAt(),
				importResult.finishedAt()));
	}

	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public void recordFailed(DatFileDescriptor descriptor, ParsedDatFile parsedFile, UUID batchId, Instant startedAt, Exception failure) {
		save(new FileImportLogRequest(
				batchId,
				descriptor.originalFilename(),
				descriptor.path().toString(),
				ImportStatus.FAILED,
				parsedFile == null ? null : parsedFile.rows().size(),
				0,
				parsedFile == null ? null : parsedFile.rows().size(),
				failureMessage(failure),
				startedAt,
				clock.instant()));
	}

	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public void recordSkipped(DatFileDescriptor descriptor, ParsedDatFile parsedFile, String reason) {
		Instant now = clock.instant();
		save(new FileImportLogRequest(
				UUID.randomUUID(),
				descriptor.originalFilename(),
				descriptor.path().toString(),
				ImportStatus.PARTIAL_SUCCESS,
				parsedFile.rows().size(),
				0,
				parsedFile.rows().size(),
				truncate("SKIPPED: " + reason),
				now,
				now));
	}

	private void save(FileImportLogRequest request) {
		importLogRepository.save(ImportLog.builder()
				.batchId(request.batchId())
				.fileName(request.fileName())
				.filePath(request.filePath())
				.status(request.status())
				.totalRows(request.totalRows())
				.importedRows(request.importedRows())
				.skippedRows(request.skippedRows())
				.errorMessage(request.errorMessage())
				.startedAt(request.startedAt())
				.finishedAt(request.finishedAt())
				.build());
	}

	private ImportStatus completedStatus(ParsedDatFile parsedFile, MeasurementPersistenceResult measurementResult) {
		if (parsedFile.issues().isEmpty()
				&& measurementResult.skippedRows() == 0
				&& measurementResult.missing() == 0
				&& measurementResult.invalid() == 0) {
			return ImportStatus.SUCCESS;
		}
		return ImportStatus.PARTIAL_SUCCESS;
	}

	private Integer skippedCount(ParsedDatFile parsedFile, MeasurementPersistenceResult measurementResult) {
		return safeInt(parsedFile.skippedRowCount()) + measurementResult.missing() + measurementResult.invalid();
	}

	private String completedMessage(
			ImportStatus status,
			ParsedDatFile parsedFile,
			MeasurementPersistenceResult measurementResult) {
		if (status == ImportStatus.SUCCESS) {
			return null;
		}
		return truncate("Completed with parseIssues=%d, skippedRows=%d, missingValues=%d, invalidValues=%d"
				.formatted(
						parsedFile.issues().size(),
						measurementResult.skippedRows(),
						measurementResult.missing(),
						measurementResult.invalid()));
	}

	private String failureMessage(Exception failure) {
		return truncate(failure.getClass().getSimpleName() + ": " + failure.getMessage());
	}

	private int safeInt(long value) {
		return value > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) value;
	}

	private String truncate(String value) {
		if (value == null || value.length() <= MAX_ERROR_MESSAGE_LENGTH) {
			return value;
		}
		return value.substring(0, MAX_ERROR_MESSAGE_LENGTH);
	}
}
