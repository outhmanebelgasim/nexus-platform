package com.nexus.importer.logging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.nexus.domain.entity.ImportLog;
import com.nexus.domain.enums.ImportStatus;
import com.nexus.importer.file.DatFileDescriptor;
import com.nexus.importer.file.DatFileType;
import com.nexus.importer.measurement.MeasurementPersistenceResult;
import com.nexus.importer.parser.DatParseIssue;
import com.nexus.importer.parser.DatParseIssueSeverity;
import com.nexus.importer.parser.ParsedDatFile;
import com.nexus.importer.parser.ParsedDataRow;
import com.nexus.importer.repository.ImporterImportLogRepository;
import com.nexus.importer.scheduling.DatFileImportResult;
import com.nexus.importer.variable.MeasurementVariableResolutionResult;

class ImportLogServiceTest {

	private static final UUID BATCH_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Instant STARTED_AT = Instant.parse("2026-07-16T12:00:00Z");
	private static final Instant FINISHED_AT = Instant.parse("2026-07-16T12:00:10Z");
	private static final Clock CLOCK = Clock.fixed(FINISHED_AT, ZoneOffset.UTC);

	private final ImporterImportLogRepository repository = org.mockito.Mockito.mock(ImporterImportLogRepository.class);
	private final ImportLogService service = new ImportLogService(repository, CLOCK);

	@Test
	void recordsSuccessLogWithCountsAndBatchId() {
		service.recordCompleted(descriptor(), parsedFile(List.of(row(), row()), List.of()), result(
				new MeasurementPersistenceResult(10, 10, 0, 0, 0, 0, 0, 1, Duration.ofMillis(5))));

		ImportLog log = savedLog();
		assertThat(log.getBatchId()).isEqualTo(BATCH_ID);
		assertThat(log.getFileName()).isEqualTo("MTO_Yazid.dat");
		assertThat(log.getFilePath()).isEqualTo("/tmp/MTO_Yazid.dat");
		assertThat(log.getStatus()).isEqualTo(ImportStatus.SUCCESS);
		assertThat(log.getTotalRows()).isEqualTo(2);
		assertThat(log.getImportedRows()).isEqualTo(10);
		assertThat(log.getSkippedRows()).isZero();
		assertThat(log.getErrorMessage()).isNull();
		assertThat(log.getStartedAt()).isEqualTo(STARTED_AT);
		assertThat(log.getFinishedAt()).isEqualTo(FINISHED_AT);
	}

	@Test
	void recordsPartialSuccessWhenParseIssuesOrSkippedValuesExist() {
		service.recordCompleted(descriptor(), parsedFile(
				List.of(row()),
				List.of(new DatParseIssue(DatParseIssueSeverity.WARNING, Path.of("/tmp/MTO_Yazid.dat"), 1, java.util.OptionalInt.empty(), "warning", null))),
				result(new MeasurementPersistenceResult(8, 8, 0, 0, 1, 2, 0, 1, Duration.ofMillis(5))));

		ImportLog log = savedLog();
		assertThat(log.getStatus()).isEqualTo(ImportStatus.PARTIAL_SUCCESS);
		assertThat(log.getImportedRows()).isEqualTo(8);
		assertThat(log.getSkippedRows()).isEqualTo(3);
		assertThat(log.getErrorMessage()).contains("parseIssues=1");
	}

	@Test
	void recordsFailedLogWithFailureMessage() {
		service.recordFailed(descriptor(), parsedFile(List.of(row()), List.of()), BATCH_ID, STARTED_AT,
				new IllegalStateException("database unavailable"));

		ImportLog log = savedLog();
		assertThat(log.getStatus()).isEqualTo(ImportStatus.FAILED);
		assertThat(log.getBatchId()).isEqualTo(BATCH_ID);
		assertThat(log.getTotalRows()).isEqualTo(1);
		assertThat(log.getImportedRows()).isZero();
		assertThat(log.getSkippedRows()).isEqualTo(1);
		assertThat(log.getErrorMessage()).contains("IllegalStateException: database unavailable");
		assertThat(log.getFinishedAt()).isEqualTo(FINISHED_AT);
	}

	@Test
	void recordsSkippedLogAsPartialSuccessBecauseEnumHasNoSkippedStatus() {
		service.recordSkipped(descriptor(), parsedFile(List.of(row()), List.of()), "No usable variable headers");

		ImportLog log = savedLog();
		assertThat(log.getStatus()).isEqualTo(ImportStatus.PARTIAL_SUCCESS);
		assertThat(log.getImportedRows()).isZero();
		assertThat(log.getSkippedRows()).isEqualTo(1);
		assertThat(log.getErrorMessage()).contains("SKIPPED");
	}

	@Test
	void saveIsIsolatedForFailureLoggingByRequiresNew() throws NoSuchMethodException {
		org.springframework.transaction.annotation.Transactional annotation = ImportLogService.class
				.getMethod("recordFailed", DatFileDescriptor.class, ParsedDatFile.class, UUID.class, Instant.class, Exception.class)
				.getAnnotation(org.springframework.transaction.annotation.Transactional.class);

		assertThat(annotation.propagation()).isEqualTo(org.springframework.transaction.annotation.Propagation.REQUIRES_NEW);
	}

	private ImportLog savedLog() {
		ArgumentCaptor<ImportLog> captor = ArgumentCaptor.forClass(ImportLog.class);
		verify(repository).save(captor.capture());
		return captor.getValue();
	}

	private static DatFileDescriptor descriptor() {
		return new DatFileDescriptor(Path.of("/tmp/MTO_Yazid.dat"), "MTO_Yazid.dat", "mto_yazid", DatFileType.THIRTY_MINUTE);
	}

	private static ParsedDatFile parsedFile(List<ParsedDataRow> rows, List<DatParseIssue> issues) {
		return new ParsedDatFile(descriptor(), List.of(), rows, issues);
	}

	private static ParsedDataRow row() {
		return new ParsedDataRow(5, java.time.LocalDateTime.of(2026, 7, 16, 12, 0), java.util.Map.of());
	}

	private static DatFileImportResult result(MeasurementPersistenceResult measurementPersistenceResult) {
		return new DatFileImportResult(
				BATCH_ID,
				STARTED_AT,
				FINISHED_AT,
				false,
				new MeasurementVariableResolutionResult(java.util.Map.of(), 0, 0, 0, 0),
				measurementPersistenceResult);
	}
}
